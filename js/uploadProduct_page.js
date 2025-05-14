document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const productImagesInput = document.getElementById('productImages');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const processedResultsContainer = document.getElementById('processedResultsContainer');
    const submitBtn = document.getElementById('submitBtn');
    const noResultsP = processedResultsContainer.querySelector('.no-results');

    let selectedFiles = []; // 用於存儲實際 File 對象，以便從預覽中移除

    if (productImagesInput) {
        productImagesInput.addEventListener('change', (event) => {
            imagePreviewContainer.innerHTML = ''; // 清空舊預覽
            selectedFiles = Array.from(event.target.files); // 更新 selectedFiles
            
            if (selectedFiles.length === 0) {
                const p = document.createElement('p');
                p.textContent = '未選擇任何圖片。';
                imagePreviewContainer.appendChild(p);
                return;
            }

            selectedFiles.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const previewItem = document.createElement('div');
                    previewItem.classList.add('preview-image-item');
                    
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.alt = `預覽 ${file.name}`;
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.classList.add('remove-preview-btn');
                    removeBtn.innerHTML = '&times;';
                    removeBtn.type = 'button'; // 防止觸發表單提交
                    removeBtn.onclick = () => {
                        previewItem.remove();
                        // 從 selectedFiles 中移除對應的 File 對象
                        selectedFiles.splice(index, 1);
                        // 更新 input.files (這比較棘手，標準做法是重新構建 DataTransfer)
                        updateFileInputFiles();
                        if(imagePreviewContainer.children.length === 0){
                            const p = document.createElement('p');
                            p.textContent = '未選擇任何圖片。';
                            imagePreviewContainer.appendChild(p);
                        }
                    };
                    
                    previewItem.appendChild(img);
                    previewItem.appendChild(removeBtn);
                    imagePreviewContainer.appendChild(previewItem);
                }
                reader.readAsDataURL(file);
            });
        });
    }

    function updateFileInputFiles() {
        const dataTransfer = new DataTransfer();
        selectedFiles.forEach(file => dataTransfer.items.add(file));
        productImagesInput.files = dataTransfer.files;
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            submitBtn.disabled = true;
            submitBtn.textContent = '上傳處理中...';
            noResultsP?.remove(); // 移除「尚未處理」的提示

            const formData = new FormData(); // 不需要手動設置 enctype，FormData 會自動處理
            const productName = document.getElementById('productName').value;
            if (productName) {
                formData.append('productName', productName);
            }

            // 使用更新後的 selectedFiles 確保只上傳預覽中存在的圖片
            if (selectedFiles.length === 0) {
                alert('請至少選擇一張圖片！');
                submitBtn.disabled = false;
                submitBtn.textContent = '上傳並處理';
                return;
            }
            selectedFiles.forEach((file) => {
                formData.append('productImages[]', file, file.name);
            });

            // --- 後端API端點 --- 
            // 您需要將 'YOUR_PYTHON_BACKEND_ENDPOINT' 替換為您實際的Python後端API端點
            const backendEndpoint = '/api/upload-and-process-images'; // 示例端點

            try {
                const response = await fetch(backendEndpoint, {
                    method: 'POST',
                    body: formData, 
                    // 注意：使用 FormData 時，瀏覽器會自動設定 Content-Type 為 multipart/form-data，
                    // 不要手動設定 headers: { 'Content-Type': 'multipart/form-data' }，否則可能導致問題
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: '發生未知錯誤，狀態碼：' + response.status }));
                    throw new Error(errorData.message || `伺服器錯誤: ${response.status}`);
                }

                const results = await response.json(); // 假設後端回傳 JSON 格式的結果
                
                processedResultsContainer.innerHTML = ''; // 清空舊結果
                if (results && results.processed_images && results.processed_images.length > 0) {
                    results.processed_images.forEach(imgInfo => {
                        const itemDiv = document.createElement('div');
                        itemDiv.classList.add('processed-image-item');
                        
                        const img = document.createElement('img');
                        img.src = imgInfo.url; // 假設回傳的物件有 url 屬性
                        img.alt = imgInfo.name || '處理後的圖片';
                        
                        const p = document.createElement('p');
                        p.textContent = imgInfo.name || '處理完成';
                        
                        itemDiv.appendChild(img);
                        itemDiv.appendChild(p);
                        processedResultsContainer.appendChild(itemDiv);
                    });
                } else {
                    const p = document.createElement('p');
                    p.classList.add('no-results');
                    p.textContent = '處理完成，但未收到有效的圖片結果。';
                    processedResultsContainer.appendChild(p);
                }

            } catch (error) {
                console.error('上傳或處理失敗:', error);
                processedResultsContainer.innerHTML = ''; // 清空可能存在的舊結果
                const pError = document.createElement('p');
                pError.classList.add('no-results');
                pError.style.color = 'red';
                pError.textContent = `處理失敗：${error.message || '請檢查網路連線或稍後再試。'}`;
                processedResultsContainer.appendChild(pError);
                // alert(`上傳失敗: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '上傳並處理';
            }
        });
    }
}); 