document.addEventListener('DOMContentLoaded', function() {
    // 導航欄邏輯已移至 nav.js，此處不再重複處理
    
    // 載入並顯示產品資料
    loadProducts();

    // 自動隱藏/顯示導覽列的邏輯
    initScrollBehavior();

    console.log('主頁面 JavaScript 已載入。');
});

/**
 * 載入並顯示產品資料
 */
async function loadProducts() {
    const productListContainer = document.getElementById('product-list-container');
    if (!productListContainer) {
        console.log('未找到產品列表容器，可能不在產品頁面');
        return;
    }

    try {
        const response = await fetch('../product.json'); // 假設 product.json 在 workspace 根目錄
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const products = await response.json();

        productListContainer.innerHTML = ''; // 清空現有內容

        const products_Cat = products.filter(product => 
            product.category === 'chair' || 
            product.category === 'sofa' || 
            product.category === 'desk' || 
            product.category === 'drawer'
        );

        if (products_Cat.length === 0) {
            productListContainer.innerHTML = '<p>目前沒有椅子類別的產品。</p>';
            return;
        }

        products_Cat.forEach(product => {
            const productItem = document.createElement('div');
            productItem.classList.add('product-item');

            // 產品主圖片 (images[0])
            const mainImage = product.images && product.images.length > 0 ? product.images[0] : 'placeholder.jpg'; // 使用預設圖片以防萬一

            // 產品尺寸處理
            let sizeDisplay = '';
            if (product.size_options && product.size_options.length > 0) {
                sizeDisplay = product.size_options.join(', ');
            }

            const parsedSizes = parseProductDimensions(product.size_options);
            let sizeParams = "";
            if (parsedSizes.widthCm !== null) sizeParams += `&targetWidthCm=${parsedSizes.widthCm}`;
            if (parsedSizes.heightCm !== null) sizeParams += `&targetHeightCm=${parsedSizes.heightCm}`;
            if (parsedSizes.depthCm !== null) sizeParams += `&targetDepthCm=${parsedSizes.depthCm}`;

            productItem.innerHTML = `
                <div class="product-image-section">
                    <img src="${mainImage}" alt="${product.name || '產品圖片'}" class="product-main-image">
                    <div class="gallery-container">
                        <button class="gallery-scroll-arrow prev-arrow" aria-label="上一張圖片">&lt;</button>
                        <div class="product-image-gallery">
                            ${product.images && product.images.length > 0 ? 
                                product.images.map(imgUrl => `<img src="${imgUrl}" alt="${product.name || '產品附圖'}" class="gallery-image ${imgUrl === mainImage ? 'active' : ''}">`).join('') : '<p class="no-gallery-images">無產品圖片</p>'
                            }
                        </div>
                        <button class="gallery-scroll-arrow next-arrow" aria-label="下一張圖片">&gt;</button>
                    </div>
                </div>
                <h3>${product.name || '未知產品'}</h3>
                <p class="product-price">NT$ ${product.price_string || '洽詢'}</p>
                <p class="product-size">尺寸：${sizeDisplay || '未提供'}</p>
                <div class="product-links">
                    <a href="${product.url || '#'}" target="_blank" class="product-link">查看產品網站</a>
                    <a href="../web/3D_model_page.html?modelUrl=${encodeURIComponent(product.model_url || '')}${sizeParams}" target="_blank" class="product-model-link">查看3D模型</a>
                </div>
            `;
            productListContainer.appendChild(productItem);

            // 附圖點擊更換主圖
            setupProductGallery(productItem);
        });

    } catch (error) {
        console.error('無法載入產品資料:', error);
        if (productListContainer) {
            productListContainer.innerHTML = '<p>無法載入產品資料，請稍後再試。</p>';
        }
    }
}

/**
 * 設置產品圖片庫的交互功能
 */
function setupProductGallery(productItem) {
    const mainImageElement = productItem.querySelector('.product-main-image');
    const galleryImages = productItem.querySelectorAll('.gallery-image');

    // 讓附圖直接更新主圖
    galleryImages.forEach(galleryImg => {
        galleryImg.addEventListener('click', () => {
            if (mainImageElement) {
                mainImageElement.src = galleryImg.src;
                mainImageElement.alt = galleryImg.alt; // 同時更新 alt 文字

                // 更新 active class
                galleryImages.forEach(img => img.classList.remove('active'));
                galleryImg.classList.add('active');
            }
        });
    });

    // 附圖庫左右箭頭滾動
    const galleryScrollContainer = productItem.querySelector('.product-image-gallery');
    const prevArrowButton = productItem.querySelector('.prev-arrow');
    const nextArrowButton = productItem.querySelector('.next-arrow');

    function updateGalleryArrows() {
        if (!galleryScrollContainer || !prevArrowButton || !nextArrowButton) return;
        
        const scrollLeft = galleryScrollContainer.scrollLeft;
        const scrollWidth = galleryScrollContainer.scrollWidth;
        const clientWidth = galleryScrollContainer.clientWidth;

        // 檢查是否有足夠內容來滾動
        if (scrollWidth <= clientWidth) {
            prevArrowButton.classList.add('hidden');
            nextArrowButton.classList.add('hidden');
            return;
        }

        prevArrowButton.classList.toggle('hidden', scrollLeft <= 0);
        nextArrowButton.classList.toggle('hidden', scrollLeft >= (scrollWidth - clientWidth -1)); // -1 for subpixel precision
    }

    if (galleryScrollContainer && prevArrowButton && nextArrowButton) {
        updateGalleryArrows(); // 初始狀態

        prevArrowButton.addEventListener('click', () => {
            const imageWidth = galleryScrollContainer.querySelector('.gallery-image')?.offsetWidth || 50;
            const gap = 6; // 與 CSS 中的 gap 一致
            galleryScrollContainer.scrollBy({ left: -(imageWidth + gap) * 2, behavior: 'smooth' }); // 滾動兩張圖片的寬度
        });

        nextArrowButton.addEventListener('click', () => {
            const imageWidth = galleryScrollContainer.querySelector('.gallery-image')?.offsetWidth || 50;
            const gap = 6;
            galleryScrollContainer.scrollBy({ left: (imageWidth + gap) * 2, behavior: 'smooth' });
        });

        galleryScrollContainer.addEventListener('scroll', updateGalleryArrows);
        setTimeout(updateGalleryArrows, 500); 
    }
}

/**
 * 初始化頁面滾動行為
 */
function initScrollBehavior() {
    const header = document.querySelector('header');
    let lastScrollTop = 0;
    const scrollThreshold = 5; // 滾動超過5px才觸發判斷，防止抖動
    let headerHeight = 0;

    function setHeaderHeight() {
        if (header) {
            headerHeight = header.offsetHeight;
            // 設定 main 內容的上邊距以避免被固定頁首遮擋
            const mainContent = document.querySelector('main'); 
            if (mainContent) {
                mainContent.style.paddingTop = headerHeight + 'px';
            }
        }
    }

    // 初始設定高度和padding
    setHeaderHeight();
    // 當視窗大小改變時重新計算 (例如旋轉設備)
    window.addEventListener('resize', setHeaderHeight);

    if (header) {
        window.addEventListener('scroll', function() {
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            // 判斷滾動方向
            if (Math.abs(scrollTop - lastScrollTop) <= scrollThreshold) {
                return; // 如果滾動幅度太小，則不處理
            }

            if (scrollTop > lastScrollTop && scrollTop > headerHeight) {
                // 向下滾動且滾動距離超過頁首高度
                header.classList.add('header-hidden');
            } else {
                // 向上滾動或滾動距離未超過頁首高度（或已到頂部附近）
                header.classList.remove('header-hidden');
            }
            
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // 處理 iOS 上的 overscroll
        }, false);
    }
}

/**
 * 解析尺寸字串
 */
function parseProductDimensions(sizeOptionsArray) {
    const dimensions = { widthCm: null, heightCm: null, depthCm: null };
    if (!sizeOptionsArray || sizeOptionsArray.length === 0 || typeof sizeOptionsArray[0] !== 'string') {
        return dimensions;
    }
    const sizeString = sizeOptionsArray[0]; // 假設主要尺寸資訊在第一個字串元素中

    // 解析寬度 (W)
    const widthMatch = sizeString.match(/(\d+(\.\d+)?)\s*寬/);
    if (widthMatch) dimensions.widthCm = parseFloat(widthMatch[1]);

    // 解析高度 (H)
    const heightMatch = sizeString.match(/(\d+(\.\d+)?)\s*高/);
    if (heightMatch) dimensions.heightCm = parseFloat(heightMatch[1]);

    // 解析深度 (D)
    const depthMatch = sizeString.match(/(\d+(\.\d+)?)\s*深/);
    if (depthMatch) dimensions.depthCm = parseFloat(depthMatch[1]);

    return dimensions;
}