import pandas as pd
import matplotlib.pyplot as plt
import os
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report

# 建立一個目錄來存放圖片
if not os.path.exists('plots'):
    os.makedirs('plots')

# 解決 matplotlib 中文顯示問題
try:
    plt.rcParams['font.sans-serif'] = ['Heiti TC'] 
    plt.rcParams['axes.unicode_minus'] = False
except Exception as e:
    print(f"警告: 設定中文字體失敗: {e}")
    print("圖表中的中文可能無法正常顯示。")

# 讀取 CSV 檔案
try:
    df = pd.read_csv('sample_data.csv')

    # --- 資料處理 ---
    print("--- 資料處理 ---")
    df_processed = pd.get_dummies(df, columns=['city'], drop_first=True)
    df_processed = df_processed.drop('id', axis=1)
    print("處理後資料:")
    print(df_processed.head())

    # --- 資料分析 ---
    print("\n--- 資料分析 ---")
    print("數值欄位描述性統計:")
    print(df_processed[['age', 'income']].describe())
    
    # 視覺化
    plt.figure(figsize=(10, 6))
    scatter = plt.scatter(df_processed['age'], df_processed['income'], c=df_processed['purchased'], cmap='viridis', alpha=0.7)
    plt.title('年齡與收入對購買行為的影響')
    plt.xlabel('年齡 (Age)')
    plt.ylabel('收入 (Income)')
    plt.legend(handles=scatter.legend_elements()[0], labels=['未購買', '已購買'])
    plt.grid(True)
    plot_path = 'plots/age_income_purchase_scatter.png'
    plt.savefig(plot_path)
    print(f"\n視覺化圖表已儲存至: {plot_path}")

    # --- 資料建模 ---
    print("\n--- 資料建模 ---")
    # 1. 定義特徵 (X) 和目標 (y)
    X = df_processed.drop('purchased', axis=1)
    y = df_processed['purchased']

    # 2. 分割資料集 (70% 訓練, 30% 測試)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
    print(f"資料集已分割: {len(X_train)} 筆訓練資料, {len(X_test)} 筆測試資料")

    # 3. 訓練邏輯迴歸模型
    model = LogisticRegression(random_state=42)
    model.fit(X_train, y_train)
    print("\n邏輯迴歸模型訓練完成。")

    # 4. 進行預測與評估
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n模型在測試集上的準確率 (Accuracy): {accuracy:.2f}")
    
    print("\n分類報告 (Classification Report):")
    print(classification_report(y_test, y_pred, zero_division=0))


except FileNotFoundError:
    print("錯誤: 'sample_data.csv' 檔案不存在。請確認檔案路徑是否正確。")
