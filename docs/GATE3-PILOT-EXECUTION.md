# System-ESG Gate 3 真人試點執行包

本工具是 **V4.1.9 候選版的 staging 輔助頁**，不修改正式站，也不把自動測試當作真人結果。

## 主持人準備

1. 招募 10–20 名真實參與者。
2. 初學者與 ESG／永續／碳管理實務人員各至少 5 名。
3. 將 P01–P10 分配給初學者，P11–P20 分配給實務人員；不得記錄姓名、電話或私人信箱。
4. 為每位參與者準備獨立 staging 帳號，並清除既有進度。
5. 將對應的試點連結與帳號分別交給參與者。

試點入口：`https://xhfpoaco78813-stack.github.io/esgtestsystem/pilot.html`

每位參與者可使用帶編號網址，例如：

`https://xhfpoaco78813-stack.github.io/esgtestsystem/pilot.html?participant=P01`

## 執行方式

1. 參與者在試點頁確認匿名編號及資料同意。
2. 另開候選版，依序完成登入、指定學習、情境練習、建立錯題、錯題回補、查看報告、重載／重新登入及跨裝置同步。
3. 每項任務使用頁面計時器，完成後選擇成功或失敗。
4. 主持人依 `GATE3-PILOT-ASSESSMENT.md` 執行前測與後測，將分數填入頁面。
5. 參與者完成十題 SUS 及自由意見。
6. 頁面通過完整檢查後，下載 `gate3-pilot-Pxx.csv` 交給主持人。

頁面資料只保存在目前瀏覽器的本機儲存空間，且只在使用者按下下載時產生 CSV；不會自動送到 Supabase 或其他服務。

## 合併與判定

將所有個人 CSV 放入同一資料夾後執行：

```text
python tools/merge_gate3_pilot_exports.py <CSV資料夾>
```

工具會：

- 確認每個檔案只有一位參與者。
- 拒絕空白或重複的參與者編號。
- 保留原始欄位順序並輸出 `data/gate3-pilot-collected.csv`。
- 自動呼叫 Gate 3 分析器並輸出 `test-results/gate3-pilot-summary.json`。
- 不合法或不完整資料會產生 `validation_errors` 並維持 `HOLD`。

Gate 3 只有在下列條件全部成立時才能 PASS：

- 樣本為 10–20 人。
- `beginner` 與 `practitioner` 各至少 5 名完整有效參與者。
- 核心任務完成率 ≥95%。
- 資料遺失與不可恢復中斷皆為 0。
- 平均前後測提升 ≥15 個百分點。
- 平均 SUS ≥70。
- 真人 P0=0、P1=0。

## 管理原則

- 不刪除失敗、中途退出或不滿意的樣本。
- 不替參與者補填、修飾或推測資料。
- 個人 CSV、合併資料與分析結果一併保存，建立可追溯證據鏈。
- 完成試點前維持 Gate 3 HOLD，不進入 Gate 4。

