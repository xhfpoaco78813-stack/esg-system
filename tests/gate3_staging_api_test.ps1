param(
  [string]$CredentialsPath = (Join-Path $PSScriptRoot '..\.tools\staging-validator.json')
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$credentials = Get-Content -Raw -LiteralPath $CredentialsPath | ConvertFrom-Json
$runtime = Get-Content -Raw -LiteralPath (Join-Path $root 'assets\runtime-config.js')
$url = [regex]::Match($runtime, '"supabaseUrl":"([^"]+)"').Groups[1].Value
$apiKey = [regex]::Match($runtime, '"supabaseAnonKey":"([^"]+)"').Groups[1].Value
if (-not $url -or -not $apiKey.StartsWith('sb_publishable_')) { throw 'staging publishable runtime config missing' }

$client = [System.Net.Http.HttpClient]::new()
$client.DefaultRequestVersion = [Version]::new(1,1)
$client.DefaultVersionPolicy = [System.Net.Http.HttpVersionPolicy]::RequestVersionOrLower
$evidence = [ordered]@{
  started_at = [DateTimeOffset]::UtcNow.ToString('o')
  project_ref = ([Uri]$url).Host.Split('.')[0]
  requests = [System.Collections.Generic.List[object]]::new()
  network_retries = [System.Collections.Generic.List[object]]::new()
  checks = [ordered]@{}
}

function Start-ApiRequest {
  param([string]$Name,[string]$Endpoint,[string]$Method='GET',[string]$Token,[object]$Body)
  $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($Method), $url + $Endpoint)
  [void]$request.Headers.TryAddWithoutValidation('apikey', $apiKey)
  if ($Token) { [void]$request.Headers.TryAddWithoutValidation('Authorization', 'Bearer ' + $Token) }
  if ($PSBoundParameters.ContainsKey('Body')) {
    $json = $Body | ConvertTo-Json -Depth 20 -Compress
    $request.Content = [System.Net.Http.StringContent]::new($json, [Text.Encoding]::UTF8, 'application/json')
  }
  [pscustomobject]@{Name=$Name;Endpoint=$Endpoint;Method=$Method;Token=$Token;Body=$Body;HasBody=$PSBoundParameters.ContainsKey('Body');Started=[Diagnostics.Stopwatch]::StartNew();Task=$client.SendAsync($request);Request=$request}
}
function Complete-ApiRequest {
  param($Pending)
  $response = $null
  for($attempt=1;$attempt -le 4;$attempt++) {
    try {
      $response = $Pending.Task.GetAwaiter().GetResult()
      break
    } catch {
      $Pending.Started.Stop(); $Pending.Request.Dispose()
      $transient = $_.Exception.ToString() -match 'SSL connection|unexpected EOF|connection.*closed|connection.*reset|timed out|temporarily unavailable'
      if(-not $transient -or $attempt -eq 4){ throw }
      $evidence.network_retries.Add([ordered]@{name=$Pending.Name;attempt=$attempt;error=$_.Exception.GetType().Name;duration_ms=$Pending.Started.ElapsedMilliseconds})
      Start-Sleep -Milliseconds (300*$attempt)
      if($Pending.HasBody){$Pending=Start-ApiRequest -Name $Pending.Name -Endpoint $Pending.Endpoint -Method $Pending.Method -Token $Pending.Token -Body $Pending.Body}
      else{$Pending=Start-ApiRequest -Name $Pending.Name -Endpoint $Pending.Endpoint -Method $Pending.Method -Token $Pending.Token}
    }
  }
  $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
  $Pending.Started.Stop()
  $evidence.requests.Add([ordered]@{name=$Pending.Name;method=$Pending.Method;status=[int]$response.StatusCode;duration_ms=$Pending.Started.ElapsedMilliseconds})
  $Pending.Request.Dispose()
  if (-not $response.IsSuccessStatusCode) { throw "$($Pending.Name) failed: HTTP $([int]$response.StatusCode) $($text.Substring(0,[Math]::Min(300,$text.Length)))" }
  if (-not $text) { return $null }
  $text | ConvertFrom-Json -Depth 30
}
function Invoke-Api {
  param([string]$Name,[string]$Endpoint,[string]$Method='GET',[string]$Token,[object]$Body)
  if ($PSBoundParameters.ContainsKey('Body')) { return Complete-ApiRequest (Start-ApiRequest -Name $Name -Endpoint $Endpoint -Method $Method -Token $Token -Body $Body) }
  Complete-ApiRequest (Start-ApiRequest -Name $Name -Endpoint $Endpoint -Method $Method -Token $Token)
}
function Invoke-Rpc($Name,$Token,$Body,$Label) { Invoke-Api -Name $Label -Endpoint "/rest/v1/rpc/$Name" -Method POST -Token $Token -Body $Body }
function Invoke-CorsProbe($Name,$Endpoint,$Origin) {
  $response=$null;$request=$null;$watch=$null
  for($attempt=1;$attempt -le 4;$attempt++){
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Options, $url + $Endpoint)
    [void]$request.Headers.TryAddWithoutValidation('Origin', $Origin)
    [void]$request.Headers.TryAddWithoutValidation('Access-Control-Request-Method', 'POST')
    [void]$request.Headers.TryAddWithoutValidation('Access-Control-Request-Headers', 'authorization,apikey,content-type')
    $watch=[Diagnostics.Stopwatch]::StartNew()
    try{$response=$client.SendAsync($request).GetAwaiter().GetResult();$watch.Stop();break}
    catch{$watch.Stop();$request.Dispose();$transient=$_.Exception.ToString()-match 'SSL connection|unexpected EOF|connection.*closed|connection.*reset|timed out|temporarily unavailable';if(-not $transient -or $attempt -eq 4){throw};$evidence.network_retries.Add([ordered]@{name=$Name;attempt=$attempt;error=$_.Exception.GetType().Name;duration_ms=$watch.ElapsedMilliseconds});Start-Sleep -Milliseconds (300*$attempt)}
  }
  $statusCode = [int]$response.StatusCode
  $evidence.requests.Add([ordered]@{name=$Name;method='OPTIONS';status=$statusCode;duration_ms=$watch.ElapsedMilliseconds})
  $allowOrigin = if ($response.Headers.Contains('Access-Control-Allow-Origin')) { @($response.Headers.GetValues('Access-Control-Allow-Origin'))[0] } else { '' }
  $request.Dispose(); $response.Dispose()
  [pscustomobject]@{Success=($statusCode -ge 200 -and $statusCode -lt 400);AllowOrigin=$allowOrigin}
}
function Get-Row($Value) { @($Value)[0] }
function Confirm-Check($Name,$Value) {
  $evidence.checks[$Name] = [bool]$Value
  if (-not $Value) { throw "check failed: $Name" }
}
function New-State($Reset,$Id,$Correct) {
  $answer = [ordered]@{correct=[bool]$Correct;at=[DateTimeOffset]::UtcNow.ToString('o')}
  $answered = [ordered]@{}; $answered[$Id] = $answer
  $wrong = [ordered]@{}; if (-not $Correct) { $wrong[$Id] = $true }
  [ordered]@{
    schema_version=4.1;cloud_reset_version=[long]$Reset;answered=$answered;learned=[ordered]@{};wrong=$wrong;exams=@()
    attempts=@([ordered]@{attempt_id=[guid]::NewGuid().ToString();question_id=$Id;correct=[bool]$Correct;at=[DateTimeOffset]::UtcNow.ToString('o')})
    past37=[ordered]@{answers=[ordered]@{}}
  }
}

$exitCode = 0
try {
  $loginBody = @{email=$credentials.email;password=$credentials.password}
  $sessionA = Invoke-Api -Name 'login-device-a' -Endpoint '/auth/v1/token?grant_type=password' -Method POST -Body $loginBody
  $sessionB = Invoke-Api -Name 'login-device-b' -Endpoint '/auth/v1/token?grant_type=password' -Method POST -Body $loginBody
  Confirm-Check 'same_account_two_sessions' ($sessionA.user.id -eq $sessionB.user.id)
  $tokenA=$sessionA.access_token; $tokenB=$sessionB.access_token
  $deviceA=[guid]::NewGuid().ToString(); $deviceB=[guid]::NewGuid().ToString()

  $questionCors = Invoke-CorsProbe 'question-bank-cors' '/functions/v1/question-bank-v41' 'https://xhfpoaco78813-stack.github.io'
  Confirm-Check 'question_bank_edge_function_cors' ($questionCors.Success -and $questionCors.AllowOrigin -eq '*')
  $adminCors = Invoke-CorsProbe 'account-admin-cors' '/functions/v1/account-admin' 'https://xhfpoaco78813-stack.github.io'
  Confirm-Check 'account_admin_edge_function_cors' ($adminCors.Success -and $adminCors.AllowOrigin -eq 'https://xhfpoaco78813-stack.github.io')
  $questionList = Invoke-Api -Name 'question-bank-list' -Endpoint '/functions/v1/question-bank-v41' -Method POST -Token $tokenA -Body @{action='list';jurisdiction='CN';limit=5}
  Confirm-Check 'question_bank_edge_function_returns_authorized_response' ($questionList.PSObject.Properties.Name -contains 'questions')

  $baseline = Get-Row (Invoke-Rpc 'esg_delete_my_learning_data_v41' $tokenA @{} 'baseline-delete')
  $generation0 = [long]$baseline.reset_version
  $oldState = New-State $generation0 'G3-OLD' $false
  Invoke-Rpc 'esg_merge_learning_state_v40' $tokenA @{p_payload=$oldState;p_device_id=$deviceA} 'a-write-old-progress' | Out-Null
  $pulledByB = Get-Row (Invoke-Api -Name 'b-pull-old-progress' -Endpoint '/rest/v1/esg_progress_v40?select=payload,version,updated_at' -Token $tokenB)
  Confirm-Check 'a_write_visible_to_b' ($pulledByB.payload.answered.'G3-OLD'.correct -eq $false)

  Invoke-Rpc 'esg_sync_exam_draft_v41' $tokenA @{p_payload=@{savedAt=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();answers=@{old=$true}};p_device_id=$deviceA;p_delete=$false;p_reset_version=$generation0} 'a-write-old-draft' | Out-Null
  $raceState = New-State $generation0 'G3-RACE' $false
  $pendingWrite = Start-ApiRequest -Name 'b-racing-write' -Endpoint '/rest/v1/rpc/esg_merge_learning_state_v40' -Method POST -Token $tokenB -Body @{p_payload=$raceState;p_device_id=$deviceB}
  $pendingDelete = Start-ApiRequest -Name 'a-racing-delete' -Endpoint '/rest/v1/rpc/esg_delete_my_learning_data_v41' -Method POST -Token $tokenA -Body @{}
  $raceWrite = Complete-ApiRequest $pendingWrite
  $raceDelete = Get-Row (Complete-ApiRequest $pendingDelete)
  Confirm-Check 'delete_write_race_requests_completed' ($null -ne $raceWrite -and $null -ne $raceDelete)
  $generation1 = [long]$raceDelete.reset_version
  Confirm-Check 'reset_generation_advanced' ($generation1 -eq $generation0 + 1)

  $stale = Get-Row (Invoke-Rpc 'esg_merge_learning_state_v40' $tokenB @{p_payload=$oldState;p_device_id=$deviceB} 'b-stale-progress-after-delete')
  Confirm-Check 'stale_device_receives_new_generation' ([long]$stale.payload.cloud_reset_version -eq $generation1)
  Confirm-Check 'old_progress_not_resurrected' (-not $stale.payload.answered.'G3-OLD' -and -not $stale.payload.answered.'G3-RACE')
  $staleDraft = Get-Row (Invoke-Rpc 'esg_sync_exam_draft_v41' $tokenB @{p_payload=@{savedAt=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+1000;answers=@{old=$true}};p_device_id=$deviceB;p_delete=$false;p_reset_version=$generation0} 'b-stale-draft-after-delete')
  Confirm-Check 'stale_draft_rejected_with_tombstone' ($staleDraft.payload.deleted -eq $true -and [long]$staleDraft.payload.cloudResetVersion -eq $generation1)

  $newState = New-State $generation1 'G3-NEW' $true
  Invoke-Rpc 'esg_merge_learning_state_v40' $tokenA @{p_payload=$newState;p_device_id=$deviceA} 'a-write-new-generation' | Out-Null
  $newByB = Get-Row (Invoke-Api -Name 'b-pull-new-generation' -Endpoint '/rest/v1/esg_progress_v40?select=payload,version,updated_at' -Token $tokenB)
  Confirm-Check 'new_generation_visible_to_b' ($newByB.payload.answered.'G3-NEW'.correct -eq $true)
  Confirm-Check 'b_does_not_show_old_generation' (-not $newByB.payload.answered.'G3-OLD' -and -not $newByB.payload.answered.'G3-RACE')
  $staleAfterNew = Get-Row (Invoke-Rpc 'esg_merge_learning_state_v40' $tokenB @{p_payload=$oldState;p_device_id=$deviceB} 'b-stale-write-after-new-progress')
  Confirm-Check 'stale_write_cannot_replace_new_progress' ($staleAfterNew.payload.answered.'G3-NEW'.correct -eq $true -and -not $staleAfterNew.payload.answered.'G3-OLD')

  $newDraft = @{savedAt=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+2000;answers=@{fresh=$true}}
  Invoke-Rpc 'esg_sync_exam_draft_v41' $tokenA @{p_payload=$newDraft;p_device_id=$deviceA;p_delete=$false;p_reset_version=$generation1} 'a-write-new-draft' | Out-Null
  Invoke-Rpc 'esg_sync_exam_draft_v41' $tokenB @{p_payload=@{savedAt=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+3000;answers=@{old=$true}};p_device_id=$deviceB;p_delete=$false;p_reset_version=$generation0} 'b-stale-draft-after-new-draft' | Out-Null
  $finalDraft = Get-Row (Invoke-Api -Name 'final-draft-state' -Endpoint '/rest/v1/esg_exam_drafts_v40?select=payload,updated_at' -Token $tokenA)
  Confirm-Check 'new_draft_survives_stale_device' ($finalDraft.payload.answers.fresh -eq $true -and -not $finalDraft.payload.answers.old)

  $finalProgress = @(Invoke-Api -Name 'final-progress-state' -Endpoint '/rest/v1/esg_progress_v40?select=payload,version,updated_by_device,updated_at' -Token $tokenA)
  $finalReset = Get-Row (Invoke-Api -Name 'final-reset-state' -Endpoint '/rest/v1/esg_data_resets_v41?select=reset_version,reset_at' -Token $tokenA)
  Confirm-Check 'single_progress_row' ($finalProgress.Count -eq 1)
  Confirm-Check 'database_final_generation_consistent' ([long]$finalProgress[0].payload.cloud_reset_version -eq [long]$finalReset.reset_version)
  Confirm-Check 'no_unhandled_http_4xx_5xx' (@($evidence.requests | Where-Object {$_.status -lt 200 -or $_.status -ge 400}).Count -eq 0)
  $evidence.final_state = [ordered]@{reset_version=[long]$finalReset.reset_version;progress_version=[long]$finalProgress[0].version;answer_ids=@($finalProgress[0].payload.answered.PSObject.Properties.Name);draft_saved_at=$finalDraft.updated_at}
  $evidence.result='PASS'
} catch {
  $evidence.result='FAIL'; $evidence.error=$_.Exception.ToString(); $exitCode=1
} finally { $client.Dispose() }

$evidence.finished_at=[DateTimeOffset]::UtcNow.ToString('o')
$output=Join-Path $root 'test-results\gate3-staging-api.json'
New-Item -ItemType Directory -Force -Path (Split-Path $output) | Out-Null
$evidence | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $output -Encoding utf8
$passed=@($evidence.checks.Values | Where-Object {$_}).Count; $total=$evidence.checks.Count
Write-Output "$($evidence.result)  $passed/$total checks; $($evidence.requests.Count) requests"
foreach($item in $evidence.checks.GetEnumerator()){ Write-Output ("{0}  {1}" -f ($(if($item.Value){'PASS'}else{'FAIL'})),$item.Key) }
if($evidence.error){ Write-Error $evidence.error -ErrorAction Continue }
exit $exitCode
