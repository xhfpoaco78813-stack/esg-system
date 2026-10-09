# System-ESG V4.1 Gate 1 修復與驗證報告

日期：2026-10-09  
分支：`gate1-remediation`  
狀態：本地修復完成，未部署，未進入 Gate 2

## V4.1.1 復驗阻斷修復

- 正式網站版本發布前標識更新為 V4.1.1，部署後可直接辨識，不再誤判為 V4.0。
- 雲端刪除只保留一條事件路徑，移除 V3.2 舊 `onclick`，避免單次點擊重複執行。
- 刪除前立即撤銷同步同意、清除排程，並等待進行中的進度及草稿同步結束；確認停止後才呼叫刪除 RPC。
- 刪除完成後同步維持關閉，A 裝置本機資料同步清空，不會在下一次一般儲存時自動重新上傳。

## V4.1.2 跨裝置刪除與交付校驗修復

- 新增帳號層級 `esg_data_resets_v41.reset_version`。每次刪除會增加世代版本，不能只靠 A 裝置的本機同意狀態。
- 學習進度及考試草稿同步均攜帶 `cloud_reset_version`；B 裝置若持有較舊世代，後端回傳刪除狀態並拒絕舊資料寫入。
- A 裝置刪除成功後清空目前本機狀態；B 裝置重新登入、輪詢或同步時也會清空舊進度與草稿，避免復活已刪資料。
- 新增 A／B 雙裝置刪除整合測試，覆蓋舊進度、歷屆紀錄、考試草稿及刪除後新世代資料。
- 新增 `tools/build_release.py`：從同一暫存目錄計算 SHA-256 並建立 ZIP，完成後重新讀取 ZIP 逐檔驗證。`version.json` 的雜湊對應 ZIP 內的實際位元組，不再受 Git 換行正規化影響。

## V4.1.3 SQL 競態與舊 RPC 封鎖修復

- 過期裝置呼叫 `esg_merge_learning_state_v40` 時只取得目前伺服器狀態，不再將雲端進度覆寫成空白；刪除後建立的新世代進度會完整保留。
- `esg_sync_exam_draft_v40` 已改為停用函式，並撤銷 `public`、`anon`、`authenticated` 的執行權限，舊客戶端不能繞過刪除版本檢查。
- 新版草稿同步、學習進度合併及帳號刪除均先以 `SELECT ... FOR UPDATE` 鎖定同一筆 `esg_data_resets_v41` 記錄。同步先取得鎖時，刪除會在其後清除資料；刪除先取得鎖時，舊世代同步會收到 tombstone 且不能寫入。
- 新增實際 PostgreSQL 執行測試，依序套用 V4.1 與 V4.1.3 migration，驗證新進度保留、舊 RPC 權限封鎖，以及草稿先於／後於刪除的兩種交錯順序。

## 修復結果

### P0｜學習到練習流程

- 15 道核准樣本題全部映射到首頁現有知識點；中國法域為 10 道，全部法域為 15 道。
- 首頁模組與知識點頁只計算目前法域的核准題。
- 沒有核准題的知識點顯示「暫無核准練習題」，不產生練習按鈕；後端函式也再次阻擋空題池。
- 300 個知識點仍可閱讀，不以待審題製造虛假練習數量。

### P1｜模考題量

- 20／50／100 題按目前核准題池判斷。
- 中國法域只有 10 道、全部法域只有 15 道，因此三種模式均停用並顯示所需題量。
- `startExam()` 增加執行時題量檢查，防止從其他入口繞過停用狀態。
- 不重複題目，不以待審題補足。

### P1｜歷屆考題進度

- 狀態格式升級為 V4.1，加入 `past37.answers`。
- `readState()` 保留舊資料並為舊狀態補上安全預設值。
- V4 同步 payload 加入 `past37`；SQL 依每題 `at` 時間選擇較新的答案，支援重新整理、重新登入及跨裝置合併。

### P1｜同步同意與刪除

- 登入、作答、定時輪詢、重新連線、頁面切換和考試草稿同步均先檢查該裝置、該帳號的同意狀態。
- 未同意時顯示「同步未開啟」，資料只存本機。
- 桌面頂部、側欄及手機「更多」均提供「隱私與同步」入口。
- 新增 `esg_delete_my_learning_data_v41()`，一次刪除 `esg_progress_v40`、`esg_exam_drafts_v40` 及存在時的舊進度資料。

### P1｜題庫存取

- 公開 `assets/app.js` 與舊獨立網站已從目前分支刪除。
- 新公開核心 `assets/app-core-v41.js` 不含 5,200 道待審題；公開包由約 3.6 MB 降至約 158 KB。
- 公開範圍定義為知識目錄、來源元資料及 15 道核准免費樣本題。
- 未來 Pro／B2B／正式題放入 `esg_question_bank_v41`，答案留在 `answer_payload`；已驗證且具有效 entitlement 的使用者只能取得題幹，提交後由 `esg_check_answer_v41()` 判分。
- 已提供 `supabase/functions/question-bank-v41/index.ts`，不再缺少受限題庫 Edge Function 原始碼。

## 測試結果

| 測試 | 結果 |
|---|---|
| Gate 1 自動驗收（映射、公開包、題量、狀態、同意、刪除、後端存取） | 22/22 通過 |
| 本地 HTTP 檔案與舊公開入口檢查 | 5/5 通過；合計 27/27 |
| `past37`、刪除世代重新載入與舊狀態升級 | 3/3 通過 |
| 安全刪除專項檢查 | 11/11 通過 |
| A／B 裝置刪除世代整合測試 | 5/5 通過 |
| 實際 PostgreSQL migration／RPC／ACL 測試 | 9/9 通過 |
| ZIP 逐檔 SHA-256 校驗 | 全數通過 |
| JavaScript 語法檢查 | 4/4 通過 |
| Git whitespace／衝突檢查 | 通過 |
| 全新瀏覽器載入 | 通過，無 console error |
| 登入牆與試用版入口 | 通過 |
| 首頁中國法域核准題數 | 10 道，與資料一致 |
| 20／50／100 模考停用 | 全部正確停用並顯示原因 |
| 桌面／手機隱私入口 | 均存在 |
| 舊 `assets/app.js` HTTP 存取 | 404 |

執行指令：

```text
python tests/gate1_acceptance.py http://127.0.0.1:4174
node tests/gate1_state_reload_test.js
node tests/gate1_cloud_delete_test.js
node tests/gate1_cross_device_delete_test.js
node tests/gate1_sql_integration_test.mjs
python tools/build_release.py --output <交付ZIP>
node --check assets/app-core-v41.js
node --check assets/sync-v40.js
node --check assets/gate1-v41.js
node --check assets/mobile-v38.js
git diff --check
```

## 尚未完成／重新驗收前須知

1. V4.1–V4.1.3 migration 與 Edge Function 尚未部署到正式 Supabase；本輪依要求只完成隔離環境修改與驗證。
2. SQL 已在隔離的 PostgreSQL 執行引擎實際套用並通過 9 項資料與權限測試；目前工作區沒有獨立 Supabase staging 專案，因此尚未宣稱完成 Supabase 雙連線並行 E2E。
3. Supabase staging 復驗仍應使用兩個實際連線同時觸發同步與刪除，確認資料庫鎖等待與提交順序；通過後才可部署正式環境。
4. 現有 10 道中國核准題不足 20 題模考，因此模考保持停用。這是修復後的正確行為；若要開放 20／50／100 模式，仍需分別增加足量、已核准且映射知識點的題目。
5. 舊 5,200 道草稿仍存在 Git 歷史，但已定義為不可發布、不可認證、不可銷售的研發草稿。若法務或資安政策要求從歷史永久移除，需另做 Git 歷史重寫與遠端強制更新。
6. `esg_question_bank_v41` 尚未匯入 Pro／B2B 題目，也未建立營運端 entitlement 發放流程；本輪完成的是安全骨架。

## 缺件檢查

- `assets`：完整，V4.1 核心與 Gate 1 UI 已加入。
- Supabase migration：既有 V3.4–V4.0 migration 均存在；V4.1 migration 已新增。
- RPC：V4 同步 RPC 原始碼存在；V4.1 刪除、受限題庫取得與判分 RPC 已新增。
- Edge Function：既有帳號管理 Function 存在；V4.1 受限題庫 Function 已新增。

重新驗收應停留在 Gate 1，先審查本分支與本報告；通過後再另行安排正式 Supabase migration、Edge Function 部署及 Gate 2。
