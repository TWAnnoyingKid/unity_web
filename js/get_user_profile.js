/**
 * 獲取用戶檔案資訊
 * @returns {Promise<Object|null>} 用戶檔案資料或 null
 */
 async function getUserProfile() {
    try {
        // 首先檢查登入狀態
        const loginResponse = await fetch('../php/check_login.php', {
            method: 'GET',
            credentials: 'same-origin' // 確保傳送 session cookies
        });
        
        if (!loginResponse.ok) {
            console.error('無法檢查登入狀態');
            return null;
        }
        
        const loginData = await loginResponse.json();
        
        // 如果用戶未登入，直接返回
        if (!loginData.isLoggedIn) {
            console.log('用戶未登入，無法獲取檔案資訊');
            return null;
        }
        
        console.log(`用戶 ${loginData.username} 已登入，開始獲取檔案資訊...`);
        
        // 獲取用戶檔案資訊
        const profileResponse = await fetch('../php/get_user_profile.php', {
            method: 'GET',
            credentials: 'same-origin' // 確保傳送 session cookies
        });
        
        if (!profileResponse.ok) {
            console.error('無法獲取用戶檔案資訊');
            return null;
        }
        
        const profileData = await profileResponse.json();
        
        // 檢查 API 回應是否成功
        if (profileData.success) {
            //console.log('成功獲取用戶檔案資訊:', profileData);
            
            // 檢查並印出 company 資訊
            if (profileData.user && profileData.user.company) {
                console.log('用戶公司資訊:', profileData.user.company);
            } else if (profileData.user && profileData.user.account) {
                // 如果沒有 company 欄位，顯示 account 資訊
                console.log('用戶帳號資訊:', profileData.user.account);
                console.log('注意：用戶檔案中沒有找到 company 欄位');
            } else {
                console.log('用戶檔案中沒有找到 company 或 account 資訊');
            }
            
            return profileData.user;
        } else {
            console.error('獲取用戶檔案失敗:', profileData.message);
            return null;
        }
        
    } catch (error) {
        console.error('獲取用戶檔案時發生錯誤:', error);
        return null;
    }
}

/**
 * 初始化用戶檔案模組
 * 在頁面載入完成後自動執行
 */
function initUserProfile() {
    // 檢查是否在適當的頁面（非登入頁面）
    if (window.location.pathname.includes('login.html')) {
        console.log('當前在登入頁面，跳過用戶檔案獲取');
        return;
    }
    
    // 等待 DOM 載入完成後執行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', getUserProfile);
    } else {
        // DOM 已經載入完成，直接執行
        getUserProfile();
    }
}

// 自動初始化
initUserProfile();

// 將函數暴露到全域，供其他模組使用
window.getUserProfile = getUserProfile;