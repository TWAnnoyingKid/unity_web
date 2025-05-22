document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const productImagesInput = document.getElementById('productImages');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const processedResultsContainer = document.getElementById('processedResultsContainer');
    const submitBtn = document.getElementById('submitBtn');
    const modelViewerContainer = document.getElementById('modelViewerContainer');
    const modelViewer = document.getElementById('modelViewer');
    const uploadProductBtn = document.getElementById('uploadProductBtn');
    
    // 從配置文件獲取 API 基礎 URL
    const API_BASE_URL = CONFIG.api.baseUrl;
    
    let selectedFiles = []; // 用於存儲實際 File 對象，以便從預覽中移除
    let currentModelInfo = null; // 存儲當前處理的模型信息

    // 設置模型查看器默認參數
    if (modelViewer) {
        modelViewer.exposure = CONFIG.modelViewer.defaultExposure;
        modelViewer.shadowIntensity = CONFIG.modelViewer.defaultShadowIntensity;
        modelViewer.shadowSoftness = CONFIG.modelViewer.defaultShadowSoftness;
        modelViewer.autoRotate = CONFIG.modelViewer.autoRotate;
    }

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

            // 驗證文件大小和類型
            const invalidFiles = selectedFiles.filter(file => {
                const isValidType = CONFIG.upload.allowedTypes.includes(file.type);
                const isValidSize = file.size <= CONFIG.upload.maxFileSize;
                return !isValidType || !isValidSize;
            });

            if (invalidFiles.length > 0) {
                alert(`有 ${invalidFiles.length} 個文件不符合要求。\n僅允許 ${CONFIG.upload.allowedTypes.join(', ')} 格式，\n且每個文件大小不超過 ${CONFIG.upload.maxFileSize / (1024 * 1024)}MB。`);
                
                // 過濾掉無效文件
                selectedFiles = selectedFiles.filter(file => {
                    const isValidType = CONFIG.upload.allowedTypes.includes(file.type);
                    const isValidSize = file.size <= CONFIG.upload.maxFileSize;
                    return isValidType && isValidSize;
                });
                
                if (selectedFiles.length === 0) {
                    const p = document.createElement('p');
                    p.textContent = '未選擇任何有效圖片。';
                    imagePreviewContainer.appendChild(p);
                    return;
                }
            }

            // 檢查文件數量限制
            if (selectedFiles.length > CONFIG.upload.maxFiles) {
                alert(`最多只能選擇 ${CONFIG.upload.maxFiles} 個文件，超過的部分將被忽略。`);
                selectedFiles = selectedFiles.slice(0, CONFIG.upload.maxFiles);
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
            
            // 更新文件輸入框
            updateFileInputFiles();
        });
    }

    function updateFileInputFiles() {
        const dataTransfer = new DataTransfer();
        selectedFiles.forEach(file => dataTransfer.items.add(file));
        productImagesInput.files = dataTransfer.files;
    }

    // 顯示加載中動畫
    function showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('loading-indicator');
        processedResultsContainer.innerHTML = '';
        processedResultsContainer.appendChild(loadingDiv);
        
        // 隱藏模型查看器
        modelViewerContainer.style.display = 'none';
    }

    // 完全隱藏處理結果區域（修復白色空間）
    function hideProcessedResults() {
        processedResultsContainer.innerHTML = '';
        processedResultsContainer.style.display = 'none'; // 完全隱藏
    }

    // 顯示處理結果區域
    function showProcessedResults() {
        processedResultsContainer.style.display = 'flex'; // 重新顯示
    }

    // 清除處理結果區域
    function clearResults() {
        showProcessedResults();
        processedResultsContainer.innerHTML = '<p class="no-results">尚未處理任何圖片。</p>';
        modelViewerContainer.style.display = 'none';
    }

    // 上傳並處理圖片
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            submitBtn.disabled = true;
            submitBtn.textContent = '上傳處理中...';
            
            // 顯示加載動畫
            showLoading();

            const formData = new FormData();
            const productName = document.getElementById('productName').value;
            const textPrompt = document.getElementById('textPrompt')?.value || '';

            if (productName) {
                formData.append('productName', productName);
            }
            
            if (textPrompt) {
                formData.append('textPrompt', textPrompt);
            }

            if (selectedFiles.length === 0) {
                alert('請至少選擇一張圖片！');
                submitBtn.disabled = false;
                submitBtn.textContent = '上傳並處理';
                clearResults();
                return;
            }
            
            selectedFiles.forEach((file) => {
                formData.append('productImages[]', file, file.name);
            });

            // 後端API端點
            const backendEndpoint = `${API_BASE_URL}/api/upload-and-process-images`;

            try {
                if (CONFIG.debug) {
                    console.log('正在連接到處理服務...');
                }
                
                const response = await fetch(backendEndpoint, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: '發生未知錯誤，狀態碼：' + response.status }));
                    throw new Error(errorData.message || `伺服器錯誤: ${response.status}`);
                }

                const results = await response.json();
                
                if (CONFIG.debug) {
                    console.log('收到處理結果');
                }
                
                if (results && results.processed_images && results.processed_images.length > 0) {
                    // 尋找3D模型文件
                    const modelFiles = results.processed_images.filter(item => item.type === '3d_model' && item.format === 'glb');
                    
                    if (modelFiles.length > 0) {
                        // 完全隱藏處理結果區域，避免白色空間
                        hideProcessedResults();
                        
                        // 記錄當前模型信息
                        currentModelInfo = {
                            name: results.product_name,
                            url: `${API_BASE_URL}${modelFiles[0].url}`
                        };
                        
                        // 設置 model-viewer 源
                        modelViewer.src = currentModelInfo.url;
                        modelViewer.alt = `${currentModelInfo.name} 3D 模型`;
                        
                        // 直接顯示模型查看器
                        modelViewerContainer.style.display = 'block';
                        
                        // 等待一下讓模型加載，然後滾動到查看器位置 (僅在移動設備上)
                        if (window.innerWidth <= 768) {
                            setTimeout(() => {
                                modelViewerContainer.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start'
                                });
                            }, 500);
                        }
                    } else {
                        showProcessedResults();
                        processedResultsContainer.innerHTML = '<p class="no-results">處理完成，但未生成 3D 模型文件。</p>';
                        modelViewerContainer.style.display = 'none';
                    }
                } else {
                    showProcessedResults();
                    processedResultsContainer.innerHTML = '<p class="no-results">處理完成，但未收到有效的結果。</p>';
                    modelViewerContainer.style.display = 'none';
                }

            } catch (error) {  
                console.error('上傳或處理失敗:', error);
                showProcessedResults();
                processedResultsContainer.innerHTML = ''; 
                const pError = document.createElement('p');
                pError.classList.add('no-results');
                pError.style.color = 'red';
                pError.textContent = `處理失敗：${error.message || '請檢查網路連線或稍後再試。'}`;
                processedResultsContainer.appendChild(pError);
                modelViewerContainer.style.display = 'none';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '上傳並處理';
            }
        });
    }

    // 上傳商品到產品資料庫
    if (uploadProductBtn) {
        uploadProductBtn.addEventListener('click', async () => {
            if (!currentModelInfo) {
                alert('請先處理並生成3D模型！');
                return;
            }
            
            const productName = document.getElementById('productName').value || currentModelInfo.name;
            
            try {
                uploadProductBtn.disabled = true;
                uploadProductBtn.textContent = '上傳中...';
                
                const response = await fetch(`${API_BASE_URL}/api/products`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        productName: productName,
                        modelUrl: currentModelInfo.url
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: '發生未知錯誤' }));
                    throw new Error(errorData.message || '上傳失敗');
                }
                
                const result = await response.json();
                
                alert(`商品 "${productName}" 上傳成功！`);
                
                // 成功上傳後可以選擇清空表單
                if (confirm('是否要清空表單以上傳新商品？')) {
                    // 清空表單
                    document.getElementById('productName').value = '';
                    if (document.getElementById('textPrompt')) {
                        document.getElementById('textPrompt').value = '';
                    }
                    selectedFiles = [];
                    imagePreviewContainer.innerHTML = '<p>未選擇任何圖片。</p>';
                    productImagesInput.value = null;
                    
                    // 清空結果
                    clearResults();
                    
                    // 重置當前模型信息
                    currentModelInfo = null;
                    
                    // 在移動設備上滾動回表單頂部
                    if (window.innerWidth <= 768) {
                        document.querySelector('.upload-form-section').scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
                
            } catch (error) {
                console.error('上傳商品失敗:', error);
                alert(`上傳商品失敗: ${error.message}`);
            } finally {
                uploadProductBtn.disabled = false;
                uploadProductBtn.textContent = '上傳此商品';
            }
        });
    }
});