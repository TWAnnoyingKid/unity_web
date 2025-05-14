document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); // 防止表單實際提交
            const username = document.getElementById('username').value;
            // 實際應用中，這裡會進行驗證並發送請求到後端
            console.log('登入表單已提交');
            console.log('使用者名稱:', username);
            alert('登入功能尚未實作！');
        });
    }
}); 