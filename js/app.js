console.log('🛍️ Inicializando tienda Aura Fragancias...');

let cart = JSON.parse(localStorage.getItem('auraCart')) || [];
let discountApplied = false;
let discountAmount = 0;
let currentDiscountCode = '';
let currentPage = 1;
let productsPerPage = 12;
let allProducts = [];
let currentSort = 'popular';

function displayFragranceDetails(product) {
    if (!product.details || typeof product.details !== 'string') {
        return '';
    }

    try {
        const details = JSON.parse(product.details);

        if (!Array.isArray(details) || details.length === 0) {
            return '';
        }

        return `
            <div class="fragrance-details">
                <h4>Detalles de la Fragancia</h4>
                <ul class="details-list">
                    ${details.map(detail => `
                        <li class="detail-item">${detail}</li>
                    `).join('')}
                </ul>
            </div>
        `;
    } catch (error) {
        console.error('❌ Error parseando detalles de fragancia:', error);
        return '';
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    console.log('✅ DOM cargado - verificando página...');

    if (!document.querySelector('.products-grid') && !document.querySelector('.hero')) {
        console.log('⚠️ No es página de tienda - omitiendo inicialización');
        return;
    }

    await initializeApp();
});

async function initializeApp() {
    try {
        initializeDOMElements();
        await loadProducts();
        initializeCarousel();
        initializeHamburgerMenu();
        updateCartCount();
        setupEventListeners();
        setupSorting();
        setupProductModal();
        console.log('✅ Tienda inicializada correctamente');
    } catch (error) {
        console.error('❌ Error inicializando tienda:', error);
        showToast('Error al cargar la tienda', true);
    }
}

function setupProductModal() {
    const modal = document.getElementById('product-modal');
    
    if (!modal) {
        console.log('ℹ️ Modal de producto no encontrado en esta página');
        return;
    }

    const closeModal = document.querySelector('.close-modal');
    
    if (closeModal) {
        closeModal.addEventListener('click', closeProductModal);
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeProductModal();
        }
    });
    
    console.log('✅ Modal de producto configurado correctamente');
}

function initializeDOMElements() {
    window.cartCount = document.querySelector('.cart-count');
    window.cartIcon = document.querySelector('.cart-icon');
    window.cartSidebar = document.getElementById('cart-sidebar');
    window.overlay = document.getElementById('overlay');
    window.closeCart = document.querySelector('.close-cart');
    window.toast = document.getElementById('toast');
    window.toastMessage = document.getElementById('toast-message');
    window.discountCodeInput = document.getElementById('discount-code');
    window.applyDiscountBtn = document.getElementById('apply-discount');
    window.discountMessage = document.getElementById('discount-message');
    window.searchInput = document.getElementById('search-input');
    window.searchBtn = document.getElementById('search-btn');
    window.productsContainer = document.getElementById('products-container');
    window.hamburger = document.querySelector('.hamburger');
    window.navLinks = document.querySelector('.nav-links');
}

function initializeHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMobile = document.querySelector('.nav-mobile');
    const mobileOverlay = document.querySelector('.mobile-overlay');
    const mobileClose = document.querySelector('.mobile-close');
    const body = document.body;

    if (!hamburger || !navMobile) {
        console.log('⚠️ Elementos del menú móvil no encontrados');
        return;
    }

    function openMobileMenu() {
        hamburger.classList.add('active');
        navMobile.classList.add('active');
        mobileOverlay.classList.add('active');
        body.classList.add('mobile-menu-open');
    }

    function closeMobileMenu() {
        hamburger.classList.remove('active');
        navMobile.classList.remove('active');
        mobileOverlay.classList.remove('active');
        body.classList.remove('mobile-menu-open');
    }

    hamburger.addEventListener('click', openMobileMenu);
    mobileClose.addEventListener('click', closeMobileMenu);
    mobileOverlay.addEventListener('click', closeMobileMenu);

    const mobileLinks = document.querySelectorAll('.nav-mobile-links a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && navMobile.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    navMobile.addEventListener('touchmove', function (e) {
        if (navMobile.classList.contains('active')) {
            e.preventDefault();
        }
    }, { passive: false });

    console.log('✅ Menú hamburguesa inicializado correctamente');
}

async function loadProducts(filter = 'all', searchTerm = '') {
    try {
        console.log('📦 Cargando productos con precios...');

        let products;
        if (window.supabaseClient && typeof window.supabaseClient.getProductsWithPrices === 'function') {
            products = await window.supabaseClient.getProductsWithPrices(filter, searchTerm);
        } else {
            console.warn('⚠️ Supabase no configurado - usando datos locales');
            products = getLocalProducts(filter, searchTerm);
        }

        allProducts = products;
        currentPage = 1;
        displayProducts(products, filter, searchTerm);
    } catch (error) {
        console.error('❌ Error loading products:', error);
        showToast('Error al cargar los productos', true);
    }
}

function renderMLSelector(prices, productId) {
    if (!prices || prices.length === 0) {
        return '<div class="no-prices">Precio no disponible</div>';
    }
    
    if (prices.length === 1) {
        return `
            <div class="single-price">
                <div class="price-display">${formatPrice(prices[0].price)}</div>
                <div class="ml-size">${prices[0].ml_amount} ML</div>
            </div>
        `;
    } else {
        const sortedPrices = prices.sort((a, b) => a.ml_amount - b.ml_amount);
        const firstPrice = sortedPrices[0];
        
        return `
            <div class="ml-selector" data-product="${productId}">
                ${sortedPrices.map((price, index) => `
                    <div class="ml-option ${index === 0 ? 'active' : ''}" 
                         data-ml="${price.ml_amount}" 
                         data-price="${price.price}"
                         data-product="${productId}">
                        ${price.ml_amount} ML
                    </div>
                `).join('')}
            </div>
            <div class="price-display" id="price-${productId}">
                ${formatPrice(firstPrice.price)}
            </div>
        `;
    }
}

function formatPrice(price) {
    const number = parseFloat(price);
    return '$' + number.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

async function incrementClickCount(productId) {
    try {
        if (window.supabaseClient && window.supabaseClient.supabase) {
            const { data: product } = await window.supabaseClient.supabase
                .from('products')
                .select('click_count')
                .eq('id', productId)
                .single();
            
            if (product) {
                const newCount = (product.click_count || 0) + 1;
                await window.supabaseClient.supabase
                    .from('products')
                    .update({ click_count: newCount })
                    .eq('id', productId);
                
                console.log(`✅ Click contado para producto ${productId}: ${newCount}`);
            }
        }
    } catch (error) {
        console.error('❌ Error incrementando click count:', error);
    }
}

function sortProducts(products, sortType) {
    const sortedProducts = [...products];
    
    switch(sortType) {
        case 'name_asc':
            return sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
        case 'name_desc':
            return sortedProducts.sort((a, b) => b.name.localeCompare(a.name));
        case 'popular':
        default:
            return sortedProducts.sort((a, b) => {
                const clicksA = a.click_count || 0;
                const clicksB = b.click_count || 0;
                return clicksB - clicksA;
            });
    }
}

function displayFeaturedProducts(products) {
    const featuredContainer = document.createElement('div');
    featuredContainer.className = 'featured-products';
    
    const popularProducts = products
        .filter(product => (product.click_count || 0) > 0)
        .sort((a, b) => (b.click_count || 0) - (a.click_count || 0))
        .slice(0, 6);
    
    if (popularProducts.length === 0) {
        return;
    }
    
    featuredContainer.innerHTML = `
        <div class="featured-title">
            <h3>Fragancias Más Populares <span class="featured-badge">🔥 Destacadas</span></h3>
            <p>Descubre las esencias favoritas de nuestra comunidad</p>
        </div>
        <div class="featured-grid" id="featured-products-container">
        </div>
    `;
    
    const productsSection = document.getElementById('products-container');
    if (productsSection && productsSection.parentNode) {
        productsSection.parentNode.insertBefore(featuredContainer, productsSection);
    }
    
    const featuredGrid = document.getElementById('featured-products-container');
    
    popularProducts.forEach(product => {
        const productImages = getProductImages(product);
        const mainImage = productImages.length > 0 ? productImages[0] : createImagePlaceholder(product.name);
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card featured-product-card';
        productCard.innerHTML = `
            <div class="popular-badge">🔥 Destacada</div>
            <div class="product-image">
                <img src="${mainImage}" alt="${product.name}" loading="lazy" 
                     onerror="this.src='${createImagePlaceholder(product.name)}'"
                     class="product-main-image"
                     data-id="${product.id}">
                ${productImages.length > 1 ? `
                <div class="image-count-badge">
                    <i class="fas fa-images"></i> ${productImages.length}
                </div>
                ` : ''}
            </div>
            <div class="product-info">
                <p class="product-category">${getCategoryName(product.category)}</p>
                <h3 class="product-name">${product.name}</h3>
                <div class="price-info">
                    <span class="price-label">Precio Abonando con Transferencia/Efectivo</span>
                    ${renderMLSelector(product.product_prices, product.id)}
                </div>
                <p class="product-description">${product.description}</p>
                ${displayFragranceDetails(product)}
                <button class="btn view-details" data-id="${product.id}">Ver Detalles</button>
            </div>
        `;
        if (featuredGrid) {
            featuredGrid.appendChild(productCard);
        }
    });
    
    initializeMLSelectors();
    
    if (featuredGrid) {
        featuredGrid.querySelectorAll('.product-main-image').forEach(img => {
            img.addEventListener('click', (e) => {
                const productId = parseInt(e.target.getAttribute('data-id'));
                openProductModal(productId);
            });
        });
        
        featuredGrid.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = parseInt(e.target.getAttribute('data-id'));
                openProductModal(productId);
            });
        });
    }
}

function displayProducts(products, filter = 'all', searchTerm = '') {
    if (!window.productsContainer) {
        console.error('❌ products-container no encontrado');
        return;
    }

    const existingFeatured = document.querySelector('.featured-products');
    if (existingFeatured) {
        existingFeatured.remove();
    }
    
    window.productsContainer.innerHTML = '';

    if (products.length === 0) {
        window.productsContainer.innerHTML = '<div class="no-products">No se encontraron productos</div>';
        removePagination();
        return;
    }

    if (searchTerm === '' && currentSort === 'popular') {
        displayFeaturedProducts(products);
        
        const sortedProducts = sortProducts(products, currentSort);
        const startIndex = (currentPage - 1) * productsPerPage;
        const endIndex = startIndex + productsPerPage;
        const paginatedProducts = sortedProducts.slice(startIndex, endIndex);
        
        displayProductGrid(paginatedProducts);
    } else {
        const sortedProducts = sortProducts(products, currentSort);
        const startIndex = (currentPage - 1) * productsPerPage;
        const endIndex = startIndex + productsPerPage;
        const paginatedProducts = sortedProducts.slice(startIndex, endIndex);
        
        displayProductGrid(paginatedProducts);
    }

    displayPagination(products.length);
}

function displayProductGrid(products) {
    products.forEach(product => {
        const productImages = getProductImages(product);
        const mainImage = productImages.length > 0 ? productImages[0] : createImagePlaceholder(product.name);

        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image">
                <img src="${mainImage}" alt="${product.name}" loading="lazy" 
                     onerror="this.src='${createImagePlaceholder(product.name)}'"
                     class="product-main-image"
                     data-id="${product.id}">
                
                ${productImages.length > 1 ? `
                <div class="image-count-badge">
                    <i class="fas fa-images"></i> ${productImages.length}
                </div>
                ` : ''}
            </div>
            <div class="product-info">
                <p class="product-category">${getCategoryName(product.category)}</p>
                <h3 class="product-name">${product.name}</h3>
                <div class="price-info">
                    <span class="price-label">Precio Abonando con Transferencia/Efectivo</span>
                    ${renderMLSelector(product.product_prices, product.id)}
                </div>
                <p class="product-description">${product.description}</p>
                
                ${displayFragranceDetails(product)}
                
                <button class="btn view-details" data-id="${product.id}">Ver Detalles</button>
            </div>
        `;
        window.productsContainer.appendChild(productCard);
    });

    initializeMLSelectors();

    document.querySelectorAll('.product-main-image').forEach(img => {
        img.addEventListener('click', (e) => {
            const productId = parseInt(e.target.getAttribute('data-id'));
            console.log('🖱️ Click en imagen de producto:', productId);
            openProductModal(productId);
        });
    });

    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = parseInt(e.target.getAttribute('data-id'));
            openProductModal(productId);
        });
    });
}

function initializeMLSelectors() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('ml-option')) {
            const option = e.target;
            const productId = option.getAttribute('data-product');
            const container = option.closest('.product-card');
            if (!container) return;
            
            const priceDisplay = container.querySelector('.price-display');
            const price = option.getAttribute('data-price');
            
            container.querySelectorAll('.ml-option').forEach(opt => {
                opt.classList.remove('active');
            });
            
            option.classList.add('active');
            
            if (priceDisplay) {
                priceDisplay.textContent = formatPrice(price);
            }
        }
    });
}

function getProductImages(product) {
    const images = [];

    if (product.image) {
        images.push(product.image);
    }

    if (product.images) {
        try {
            if (typeof product.images === 'string') {
                const parsedImages = JSON.parse(product.images);
                if (Array.isArray(parsedImages)) {
                    parsedImages.forEach(img => {
                        if (img && !images.includes(img)) {
                            images.push(img);
                        }
                    });
                }
            } else if (Array.isArray(product.images)) {
                product.images.forEach(img => {
                    if (img && !images.includes(img)) {
                        images.push(img);
                    }
                });
            }
        } catch (e) {
            console.warn('❌ Error parseando imágenes:', e);
        }
    }

    return images;
}

function displayPagination(totalProducts) {
    removePagination();

    const totalPages = Math.ceil(totalProducts / productsPerPage);
    if (totalPages <= 1) return;

    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination';
    paginationContainer.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 40px 0;
        gap: 10px;
        flex-wrap: wrap;
    `;

    const prevButton = document.createElement('button');
    prevButton.innerHTML = '&laquo; Anterior';
    prevButton.disabled = currentPage === 1;
    prevButton.style.cssText = `
        padding: 10px 15px;
        border: 1px solid #ddd;
        background: ${currentPage === 1 ? '#f5f5f5' : 'white'};
        color: ${currentPage === 1 ? '#999' : '#333'};
        cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'};
        border-radius: 5px;
        transition: all 0.3s ease;
    `;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayProducts(allProducts);
            if (window.productsContainer) {
                window.scrollTo({ top: window.productsContainer.offsetTop - 100, behavior: 'smooth' });
            }
        }
    });

    const pageNumbers = document.createElement('div');
    pageNumbers.style.cssText = `
        display: flex;
        gap: 5px;
        align-items: center;
    `;

    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.style.cssText = `
            padding: 10px 15px;
            border: 1px solid ${i === currentPage ? '#615b04' : '#ddd'};
            background: ${i === currentPage ? '#615b04' : 'white'};
            color: ${i === currentPage ? 'white' : '#333'};
            cursor: pointer;
            border-radius: 5px;
            transition: all 0.3s ease;
            min-width: 45px;
        `;
        pageButton.addEventListener('click', () => {
            currentPage = i;
            displayProducts(allProducts);
            if (window.productsContainer) {
                window.scrollTo({ top: window.productsContainer.offsetTop - 100, behavior: 'smooth' });
            }
        });
        pageNumbers.appendChild(pageButton);
    }

    const nextButton = document.createElement('button');
    nextButton.innerHTML = 'Siguiente &raquo;';
    nextButton.disabled = currentPage === totalPages;
    nextButton.style.cssText = `
        padding: 10px 15px;
        border: 1px solid #ddd;
        background: ${currentPage === totalPages ? '#f5f5f5' : 'white'};
        color: ${currentPage === totalPages ? '#999' : '#333'};
        cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'};
        border-radius: 5px;
        transition: all 0.3s ease;
    `;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayProducts(allProducts);
            if (window.productsContainer) {
                window.scrollTo({ top: window.productsContainer.offsetTop - 100, behavior: 'smooth' });
            }
        }
    });

    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    pageInfo.style.cssText = `
        margin: 0 15px;
        color: #666;
        font-size: 14px;
    `;

    paginationContainer.appendChild(prevButton);
    paginationContainer.appendChild(pageNumbers);
    paginationContainer.appendChild(pageInfo);
    paginationContainer.appendChild(nextButton);

    if (window.productsContainer && window.productsContainer.parentNode) {
        window.productsContainer.parentNode.appendChild(paginationContainer);
    }
}

function removePagination() {
    const existingPagination = document.querySelector('.pagination');
    if (existingPagination) {
        existingPagination.remove();
    }
}

function getCategoryName(category) {
    switch (category) {
        case 'women': return 'Para Mujer';
        case 'men': return 'Para Hombre';
        case 'unisex': return 'Unisex';
        default: return '';
    }
}

let currentSlide = 0;
let carouselInterval;

function initializeCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.carousel-indicator');
    const carouselInner = document.querySelector('.carousel-inner');
    const prevBtn = document.querySelector('.carousel-control.prev');
    const nextBtn = document.querySelector('.carousel-control.next');

    if (!slides.length) {
        console.log('⚠️ No hay carrusel en esta página');
        return;
    }

    function showSlide(index) {
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;

        currentSlide = index;
        if (carouselInner) {
            carouselInner.style.transform = `translateX(-${currentSlide * 25}%)`;
        }

        indicators.forEach((indicator, i) => {
            if (i === currentSlide) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function prevSlide() {
        showSlide(currentSlide - 1);
    }

    function startCarousel() {
        stopCarousel();
        carouselInterval = setInterval(nextSlide, 5000);
    }

    function stopCarousel() {
        if (carouselInterval) {
            clearInterval(carouselInterval);
        }
    }

    if (prevBtn) prevBtn.addEventListener('click', () => {
        stopCarousel();
        prevSlide();
        startCarousel();
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
        stopCarousel();
        nextSlide();
        startCarousel();
    });

    if (indicators.length) {
        indicators.forEach(indicator => {
            indicator.addEventListener('click', () => {
                stopCarousel();
                const slideIndex = parseInt(indicator.getAttribute('data-slide'));
                showSlide(slideIndex);
                startCarousel();
            });
        });
    }

    const carousel = document.querySelector('.carousel');
    if (carousel) {
        carousel.addEventListener('mouseenter', stopCarousel);
        carousel.addEventListener('mouseleave', startCarousel);
    }

    startCarousel();
}

function stopCarousel() {
    if (carouselInterval) {
        clearInterval(carouselInterval);
    }
}

function setupSorting() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            displayProducts(allProducts);
        });
    }
}

function setupEventListeners() {
    console.log('🔧 Configurando event listeners de tienda...');

    if (window.cartIcon) {
        window.cartIcon.addEventListener('click', openCart);
    }

    if (window.closeCart) {
        window.closeCart.addEventListener('click', closeCartSidebar);
    }

    if (window.overlay) {
        window.overlay.addEventListener('click', closeCartSidebar);
    }

    if (window.applyDiscountBtn) {
        window.applyDiscountBtn.addEventListener('click', applyDiscount);
    }

    if (window.discountCodeInput) {
        window.discountCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyDiscount();
            }
        });
    }

    if (window.searchBtn) {
        window.searchBtn.addEventListener('click', performSearch);
    }

    if (window.searchInput) {
        window.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    const checkoutBtn = document.getElementById('checkout-whatsapp');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkoutWhatsApp);
    }

    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const filter = button.getAttribute('data-filter');
            const searchTerm = window.searchInput ? window.searchInput.value.trim() : '';
            loadProducts(filter, searchTerm);
        });
    });

    console.log('✅ Event listeners de tienda configurados');
}

function performSearch() {
    const searchTerm = window.searchInput ? window.searchInput.value.trim() : '';
    const activeFilter = document.querySelector('.filter-btn.active');
    const filter = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
    loadProducts(filter, searchTerm);
}

function openCart() {
    if (window.cartSidebar) {
        window.cartSidebar.classList.add('open');
    }
    if (window.overlay) {
        window.overlay.classList.add('show');
    }
    document.body.style.overflow = 'hidden';
    renderCartItems();
}

function closeCartSidebar() {
    if (window.cartSidebar) {
        window.cartSidebar.classList.remove('open');
    }
    if (window.overlay) {
        window.overlay.classList.remove('show');
    }
    document.body.style.overflow = 'auto';
}

function updateCartCount() {
    if (window.cartCount) {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        window.cartCount.textContent = totalItems;
    }
}

function showToast(message, isError = false) {
    if (!window.toast || !window.toastMessage) return;

    window.toastMessage.textContent = message;
    window.toast.classList.remove('error');

    if (isError) {
        window.toast.classList.add('error');
    }

    window.toast.classList.add('show');

    setTimeout(() => {
        window.toast.classList.remove('show');
    }, 3000);
}

// FUNCIÓN MODIFICADA: Ahora incluye ml_amount en el carrito
function addToCart(product, selectedML = null, selectedPrice = null) {
    // Crear un ID único que incluya el producto y el tamaño ML
    const itemId = selectedML ? `${product.id}-${selectedML}` : product.id.toString();
    
    const existingItem = cart.find(item => item.id === itemId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: itemId, // ID único que incluye ML
            productId: product.id, // ID original del producto para referencia
            name: product.name,
            price: selectedPrice || product.price,
            ml_amount: selectedML || 'N/A', // Guardar el tamaño ML
            image: product.image,
            quantity: 1
        });
    }

    localStorage.setItem('auraCart', JSON.stringify(cart));
    updateCartCount();
    showToast(`${product.name} ${selectedML ? `(${selectedML}ML) ` : ''}añadido al carrito`);
}

async function applyDiscount() {
    if (!window.discountCodeInput || !window.discountMessage) return;

    const code = window.discountCodeInput.value.trim();

    if (!code) {
        window.discountMessage.textContent = 'Por favor ingresa un código de descuento';
        window.discountMessage.className = 'discount-message discount-error';
        return;
    }

    const customerNameInput = document.getElementById('customer-name');
    const savedCustomerName = customerNameInput ? customerNameInput.value : '';

    window.applyDiscountBtn.disabled = true;
    window.applyDiscountBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando...';

    try {
        console.log('🎫 Validando código de descuento:', code);

        const result = await window.supabaseClient.validateDiscountCode(code);

        if (result.valid) {
            discountApplied = true;
            discountAmount = result.discount_percent;
            currentDiscountCode = result.code;

            window.discountMessage.textContent = result.message;
            window.discountMessage.className = 'discount-message discount-success';

            window.discountCodeInput.disabled = true;
            window.applyDiscountBtn.style.display = 'none';

            renderCartItems();

            if (savedCustomerName) {
                setTimeout(() => {
                    const newCustomerNameInput = document.getElementById('customer-name');
                    if (newCustomerNameInput) {
                        newCustomerNameInput.value = savedCustomerName;
                    }
                }, 100);
            }

            showToast(`¡Descuento del ${discountAmount}% aplicado!`);

        } else {
            discountApplied = false;
            discountAmount = 0;
            currentDiscountCode = '';

            window.discountMessage.textContent = result.message;
            window.discountMessage.className = 'discount-message discount-error';

            renderCartItems();

            if (savedCustomerName) {
                setTimeout(() => {
                    const newCustomerNameInput = document.getElementById('customer-name');
                    if (newCustomerNameInput) {
                        newCustomerNameInput.value = savedCustomerName;
                    }
                }, 100);
            }
        }

    } catch (error) {
        console.error('❌ Error aplicando descuento:', error);

        const localDiscountCodes = {};

        const cleanCode = code.toUpperCase();

        if (localDiscountCodes[cleanCode]) {
            discountApplied = true;
            discountAmount = localDiscountCodes[cleanCode];
            currentDiscountCode = cleanCode;

            window.discountMessage.textContent = `¡Descuento del ${discountAmount}% aplicado! (Local)`;
            window.discountMessage.className = 'discount-message discount-success';

            window.discountCodeInput.disabled = true;
            window.applyDiscountBtn.style.display = 'none';

            renderCartItems();

            if (savedCustomerName) {
                setTimeout(() => {
                    const newCustomerNameInput = document.getElementById('customer-name');
                    if (newCustomerNameInput) {
                        newCustomerNameInput.value = savedCustomerName;
                    }
                }, 100);
            }

            showToast(`¡Descuento del ${discountAmount}% aplicado!`);
        } else {
            discountApplied = false;
            discountAmount = 0;
            currentDiscountCode = '';

            window.discountMessage.textContent = 'Código de descuento no válido';
            window.discountMessage.className = 'discount-message discount-error';
            renderCartItems();

            if (savedCustomerName) {
                setTimeout(() => {
                    const newCustomerNameInput = document.getElementById('customer-name');
                    if (newCustomerNameInput) {
                        newCustomerNameInput.value = savedCustomerName;
                    }
                }, 100);
            }
        }
    } finally {
        window.applyDiscountBtn.disabled = false;
        window.applyDiscountBtn.innerHTML = '<i class="fas fa-tag"></i> Aplicar';
    }
}

// FUNCIÓN MODIFICADA: Ahora muestra el ML en el carrito
function renderCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartDiscount = document.getElementById('cart-discount');
    const cartTotal = document.getElementById('cart-total');

    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="cart-empty">Tu carrito está vacío</div>';
        const existingForm = document.querySelector('.customer-form');
        if (existingForm) {
            existingForm.remove();
        }
        if (cartSubtotal) cartSubtotal.textContent = formatPrice(0);
        if (cartDiscount) cartDiscount.textContent = `-${formatPrice(0)}`;
        if (cartTotal) cartTotal.textContent = formatPrice(0);
        if (window.discountCodeInput) window.discountCodeInput.value = '';
        if (window.discountMessage) window.discountMessage.textContent = '';
        discountApplied = false;
        discountAmount = 0;
        return;
    }

    cartItemsContainer.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        const priceValue = parseFloat(item.price);
        const itemTotal = priceValue * item.quantity;
        subtotal += itemTotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.style.cssText = `
            display: flex;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #eee;
            gap: 15px;
        `;

        // Mostrar el tamaño ML si está disponible
        const mlInfo = item.ml_amount && item.ml_amount !== 'N/A' ? 
            `<div class="cart-item-ml" style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">${item.ml_amount} ML</div>` : '';

        cartItem.innerHTML = `
            <img src="${getSafeImageUrl(item.image, item.name)}" alt="${item.name}" class="cart-item-image" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
            <div class="cart-item-details" style="flex: 1;">
                <div class="cart-item-name" style="font-weight: 600; margin-bottom: 5px;">${item.name}</div>
                ${mlInfo}
                <div class="cart-item-price" style="color: #666; margin-bottom: 8px;">${formatPrice(item.price)}</div>
                <div class="cart-item-quantity" style="display: flex; align-items: center; gap: 10px;">
                    <button class="decrease-quantity" data-id="${item.id}" style="width: 30px; height: 30px; border: 1px solid #ddd; background: white; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">-</button>
                    <span style="min-width: 30px; text-align: center;">${item.quantity}</span>
                    <button class="increase-quantity" data-id="${item.id}" style="width: 30px; height: 30px; border: 1px solid #ddd; background: white; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
                </div>
            </div>
            <div class="cart-item-total" style="font-weight: 600; min-width: 80px; text-align: right;">
                 ${formatPrice(priceValue * item.quantity)}
            </div>
            <button class="remove-item" data-id="${item.id}" style="background: none; border: none; color: #999; cursor: pointer; padding: 5px; margin-left: 10px;">
                <i class="fas fa-trash"></i>
            </button>
        `;
        cartItemsContainer.appendChild(cartItem);
    });

    const existingForm = document.querySelector('.customer-form');
    if (existingForm) {
        existingForm.remove();
    }

    const customerForm = document.createElement('div');
    customerForm.className = 'customer-form';
    customerForm.style.cssText = `
        margin: 20px 0;
        padding: 20px 0;
        border-top: 1px solid #eee;
        border-bottom: 1px solid #eee;
    `;

    customerForm.innerHTML = `
        <h4 class="customer-title" style="margin-bottom: 15px; color: var(--primary-color); font-size: 1.1rem;">
            <i class="fas fa-user" style="margin-right: 8px;"></i>Datos del Cliente
        </h4>
        <div class="customer-input" style="display: flex; gap: 10px;">
            <input type="text" 
                   class="customer-name" 
                   id="customer-name" 
                   placeholder="Nombre y Apellido"
                   style="flex: 1; padding: 12px 15px; border: 1px solid #ddd; border-radius: 5px; font-size: 0.9rem;"
                   required>
        </div>
        <div class="customer-help" style="margin-top: 8px; font-size: 0.8rem; color: #666;">
            * Ingresa tu nombre para completar la Consulta
        </div>
    `;

    const discountSection = document.querySelector('.discount-section');
    if (discountSection) {
        cartItemsContainer.parentNode.insertBefore(customerForm, discountSection);
    } else {
        cartItemsContainer.parentNode.appendChild(customerForm);
    }

    let discount = 0;
    if (discountApplied) {
        discount = subtotal * (discountAmount / 100);
        const discountInfo = document.createElement('div');
        discountInfo.className = 'discount-info';
        discountInfo.style.cssText = `
            background: #d4edda;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            text-align: center;
            border: 1px solid #c3e6cb;
        `;
        discountInfo.innerHTML = `
            <strong>🎫 Código aplicado: ${currentDiscountCode}</strong><br>
            <small>Descuento: ${discountAmount}% (${discount.toFixed(2)}$)</small>
        `;

        const customerForm = document.querySelector('.customer-form');
        if (customerForm) {
            customerForm.parentNode.insertBefore(discountInfo, customerForm.nextSibling);
        }
    }

    const total = subtotal - discount;

    if (cartSubtotal) cartSubtotal.textContent = formatPrice(subtotal);
    if (cartDiscount) cartDiscount.textContent = `-${formatPrice(discount)}`;
    if (cartTotal) cartTotal.textContent = formatPrice(total);

    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const itemId = e.currentTarget.getAttribute('data-id');
            removeFromCart(itemId);
        });
    });

    document.querySelectorAll('.increase-quantity').forEach(button => {
        button.addEventListener('click', (e) => {
            const itemId = e.currentTarget.getAttribute('data-id');
            updateQuantity(itemId, 1);
        });
    });

    document.querySelectorAll('.decrease-quantity').forEach(button => {
        button.addEventListener('click', (e) => {
            const itemId = e.currentTarget.getAttribute('data-id');
            updateQuantity(itemId, -1);
        });
    });
}

function updateQuantity(itemId, change) {
    const item = cart.find(item => item.id === itemId);
    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        removeFromCart(itemId);
    } else {
        localStorage.setItem('auraCart', JSON.stringify(cart));
        updateCartCount();
        renderCartItems();
        showToast(`Cantidad de ${item.name} actualizada`);
    }
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    localStorage.setItem('auraCart', JSON.stringify(cart));
    updateCartCount();
    renderCartItems();
    showToast('Producto eliminado del carrito');
}

// FUNCIÓN MODIFICADA: Ahora incluye información de ML en el mensaje de WhatsApp
function checkoutWhatsApp() {
    if (cart.length === 0) {
        showToast('Tu carrito está vacío');
        return;
    }

    const customerNameInput = document.getElementById('customer-name');
    if (!customerNameInput || !customerNameInput.value.trim()) {
        showToast('Por favor ingresa tu nombre y apellido', true);
        if (customerNameInput) customerNameInput.focus();
        return;
    }

    const customerName = customerNameInput.value.trim();
    const phoneNumber = "5493584170048";

    console.log('🔍 DEBUG checkoutWhatsApp:');
    console.log('discountApplied:', discountApplied);
    console.log('discountAmount:', discountAmount);
    console.log('currentDiscountCode:', currentDiscountCode);

    let message = `*NUEVO PEDIDO - SL FRAGANCIAS*\n\n`;
    message += `*DATOS DEL CLIENTE:*\n`;
    message += `  Nombre: ${customerName}\n\n`;
    message += `*DETALLE DEL PEDIDO:*\n`;

    cart.forEach(item => {
        const itemTotal = parseFloat(item.price) * item.quantity;
        // Incluir información de ML en el mensaje
        const mlInfo = item.ml_amount && item.ml_amount !== 'N/A' ? ` (${item.ml_amount} ML)` : '';
        message += `➤ ${item.name}${mlInfo}\n`;
        message += `   Cantidad: ${item.quantity}\n`;
        message += `   Precio unitario: ${formatPrice(item.price)}\n`;
        message += `   Subtotal: ${formatPrice(itemTotal)}\n\n`;
    });

    let subtotal = cart.reduce((sum, item) => {
        const priceValue = parseFloat(item.price);
        return sum + (priceValue * item.quantity);
    }, 0);

    let discount = 0;

    if (discountApplied && discountAmount > 0) {
        discount = subtotal * (discountAmount / 100);
        message += `*INFORMACIÓN DE DESCUENTO:*\n`;

        let discountCodeToShow = currentDiscountCode;
        if (!discountCodeToShow && window.discountCodeInput) {
            discountCodeToShow = window.discountCodeInput.value.trim().toUpperCase();
        }

        message += `  Código aplicado: ${discountCodeToShow || 'Descuento aplicado'}\n`;
        message += `  Descuento: -${formatPrice(discount)}\n`;
        message += `  Ahorro: ${formatPrice(discount)}\n\n`;
    }

    const total = subtotal - discount;

    message += `*RESUMEN DE PAGO:*\n`;
    message += `  Subtotal: ${formatPrice(subtotal)}\n`;
    if (discount > 0) {
        message += `  Descuento: -${formatPrice(discount)}\n`;
    }
    message += `*  TOTAL A PAGAR: ${formatPrice(total)}*\n\n`;
    message += `*INFORMACIÓN ADICIONAL:*\n`;
    message += `  Método de entrega: A coordinar\n`;
    message += `  Forma de pago: Efectivo o transferencia\n\n`;
    message += `¡Gracias por tu Consulta!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappURL, '_blank');

    cart = [];
    localStorage.setItem('auraCart', JSON.stringify(cart));
    updateCartCount();
    closeCartSidebar();

    discountApplied = false;
    discountAmount = 0;
    currentDiscountCode = '';
}

function getSafeImageUrl(imageUrl, productName = 'Producto') {
    if (!imageUrl) {
        return createImagePlaceholder(productName);
    }

    if (imageUrl.includes('supabase.co/storage/v1/object/public/')) {
        return imageUrl;
    }

    if (imageUrl === 'default-product.jpg' || imageUrl.includes('default-product')) {
        return createImagePlaceholder(productName);
    }

    if (imageUrl.startsWith('http') || imageUrl.startsWith('data:image')) {
        return imageUrl;
    }

    return createImagePlaceholder(productName);
}

function createImagePlaceholder(productName) {
    return `data:image/svg+xml;base64,${btoa(`
        <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f8f9fa"/>
            <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="14" 
                  fill="#6c757d" text-anchor="middle">${productName.substring(0, 20)}</text>
            <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="12" 
                  fill="#999" text-anchor="middle">Imagen no disponible</text>
        </svg>
    `)}`;
}

function getLocalProducts(filter = 'all', searchTerm = '') {
    const localProducts = [
        {
            id: 1,
            name: "Nocturnal Bloom",
            category: "women",
            price: "94.99",
            image: "https://images.unsplash.com/photo-1547887537-6158d64c35b3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
            description: "Una fragancia cautivadora que combina notas de rosa negra, jazmín y vainilla.",
            details: [
                "Notas de salida: Bergamota, Pimienta Rosa",
                "Notas de corazón: Rosa Negra, Jazmín Sambac",
                "Notas de fondo: Vainilla, Ámbar, Sándalo",
                "Duración: 8-10 horas",
                "Intensidad: Alta"
            ],
            brand: "Aura",
            section: "Premium",
            product_prices: [
                { ml_amount: 50, price: "94.99" },
                { ml_amount: 100, price: "159.99" }
            ]
        },
        {
            id: 2,
            name: "Midnight Oud",
            category: "men",
            price: "124.99",
            image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=688&q=80",
            description: "Una fragancia intensa y masculina con notas de oud, cuero y tabaco.",
            details: [
                "Notas de salida: Cardamomo, Pimienta Negra",
                "Notas de corazón: Oud, Cuero, Cedro",
                "Notas de fondo: Tabaco, Vainilla, Ámbar Gris",
                "Duración: 10-12 horas",
                "Intensidad: Muy Alta"
            ],
            brand: "Aura",
            section: "Luxury",
            product_prices: [
                { ml_amount: 50, price: "124.99" },
                { ml_amount: 100, price: "199.99" }
            ]
        },
        {
            id: 3,
            name: "Solar Essence",
            category: "unisex",
            price: "79.99",
            image: "https://images.unsplash.com/photo-1615634376653-57222ba1e7b4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
            description: "Fragancia fresca y energética perfecta para el día a día.",
            details: [
                "Notas de salida: Limón, Bergamota, Menta",
                "Notas de corazón: Neroli, Jazmín, Lirio",
                "Notas de fondo: Almizcle, Vainilla Blanca",
                "Duración: 6-8 horas",
                "Intensidad: Media"
            ],
            brand: "Aura",
            section: "Essentials",
            product_prices: [
                { ml_amount: 30, price: "79.99" },
                { ml_amount: 50, price: "119.99" },
                { ml_amount: 100, price: "189.99" }
            ]
        }
    ];

    let filtered = filter === 'all' ? localProducts : localProducts.filter(p => p.category === filter);

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term) ||
            (p.section && p.section.toLowerCase().includes(term))
        );
    }

    return filtered;
}

function getLocalProductById(productId) {
    const localProducts = [
        {
            id: 1,
            name: "Nocturnal Bloom",
            category: "women",
            price: "94.99",
            image: "https://images.unsplash.com/photo-1547887537-6158d64c35b3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
            description: "Una fragancia cautivadora que combina notas de rosa negra, jazmín y vainilla.",
            details: [
                "Notas de salida: Bergamota, Pimienta Rosa",
                "Notas de corazón: Rosa Negra, Jazmín Sambac",
                "Notas de fondo: Vainilla, Ámbar, Sándalo",
                "Duración: 8-10 horas",
                "Intensidad: Alta"
            ],
            brand: "Aura",
            section: "Premium",
            images: [
                "https://images.unsplash.com/photo-1547887537-6158d64c35b3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
                "https://images.unsplash.com/photo-1590736969955-1d0c89c6c8a8?ixlib=rb-4.0.3&auto=format&fit=crop&w=687&q=80"
            ],
            product_prices: [
                { ml_amount: 50, price: "94.99" },
                { ml_amount: 100, price: "159.99" }
            ]
        },
        {
            id: 2,
            name: "Midnight Oud",
            category: "men",
            price: "124.99",
            image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=688&q=80",
            description: "Una fragancia intensa y masculina con notas de oud, cuero y tabaco.",
            details: [
                "Notas de salida: Cardamomo, Pimienta Negra",
                "Notas de corazón: Oud, Cuero, Cedro",
                "Notas de fondo: Tabaco, Vainilla, Ámbar Gris",
                "Duración: 10-12 horas",
                "Intensidad: Muy Alta"
            ],
            brand: "Aura",
            section: "Luxury",
            images: [
                "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=688&q=80",
                "https://images.unsplash.com/photo-1544441893-675973e31985?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80"
            ],
            product_prices: [
                { ml_amount: 50, price: "124.99" },
                { ml_amount: 100, price: "199.99" }
            ]
        },
        {
            id: 3,
            name: "Solar Essence",
            category: "unisex",
            price: "79.99",
            image: "https://images.unsplash.com/photo-1615634376653-57222ba1e7b4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
            description: "Fragancia fresca y energética perfecta para el día a día.",
            details: [
                "Notas de salida: Limón, Bergamota, Menta",
                "Notas de corazón: Neroli, Jazmín, Lirio",
                "Notas de fondo: Almizcle, Vainilla Blanca",
                "Duración: 6-8 horas",
                "Intensidad: Media"
            ],
            brand: "Aura",
            section: "Essentials",
            images: [
                "https://images.unsplash.com/photo-1615634376653-57222ba1e7b4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
                "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=1074&q=80"
            ],
            product_prices: [
                { ml_amount: 30, price: "79.99" },
                { ml_amount: 50, price: "119.99" },
                { ml_amount: 100, price: "189.99" }
            ]
        }
    ];

    return localProducts.find(product => product.id === productId);
}

// FUNCIÓN MODIFICADA: Ahora pasa la información de ML al agregar al carrito
async function openProductModal(productId) {
    try {
        await incrementClickCount(productId);
        
        let product;

        if (window.supabaseClient && typeof window.supabaseClient.getProductWithPricesById === 'function') {
            product = await window.supabaseClient.getProductWithPricesById(productId);
        } else {
            console.warn('⚠️ Supabase no disponible - usando datos locales');
            product = getLocalProductById(productId);
        }

        if (!product) {
            showToast('Producto no encontrado', true);
            return;
        }

        const productImages = getProductImages(product);
        const prices = product.product_prices || [];

        console.log('🖼️ Imágenes para modal:', productImages);
        console.log('💰 Precios para modal:', prices);

        const modalBody = document.getElementById('modal-body');
        if (!modalBody) return;

        modalBody.innerHTML = `
            <div class="modal-image">
                <div class="product-gallery">
                    <div class="gallery-main">
                        <img src="${productImages[0] || createImagePlaceholder(product.name)}" 
                             alt="${product.name}" id="gallery-main-img"
                             onerror="this.src='${createImagePlaceholder(product.name)}'"
                             style="cursor: pointer;">
                    </div>
                    ${productImages.length > 1 ? `
                    <div class="gallery-thumbnails">
                        ${productImages.map((img, index) => `
                            <div class="gallery-thumb ${index === 0 ? 'active' : ''}" data-index="${index}">
                                <img src="${img}" alt="${product.name}" 
                                     onerror="this.src='${createImagePlaceholder(product.name)}'"
                                     style="cursor: pointer;">
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                    ${productImages.length > 1 ? `
                    <div class="gallery-nav">
                        <div class="gallery-nav-btn prev-gallery">
                            <i class="fas fa-chevron-left"></i>
                        </div>
                        <div class="gallery-nav-btn next-gallery">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="modal-info">
                <p class="modal-category">${getCategoryName(product.category)}</p>
                <h2 class="modal-name">${product.name}</h2>
                
                <div class="modal-price-section">
                    <span class="price-label">Precio Abonando con Transferencia/Efectivo</span>
                    ${renderMLSelector(prices, productId)}
                </div>
                
                <p class="modal-description">${product.description}</p>
                
                ${product.details && product.details.length > 0 ? `
                <div class="modal-details">
                    <h4>Detalles de la Fragancia</h4>
                    <ul>
                        ${Array.isArray(product.details) ? 
                            product.details.map(detail => `<li>${detail}</li>`).join('') : 
                            (typeof product.details === 'string' ? 
                                JSON.parse(product.details).map(detail => `<li>${detail}</li>`).join('') : '')
                        }
                    </ul>
                </div>
                ` : ''}
                
                <div class="modal-actions">
                    <button class="btn btn-whatsapp consult-whatsapp" data-id="${product.id}">
                        <i class="fab fa-whatsapp"></i> Consultar por WhatsApp
                    </button>
                    <button class="btn btn-cart add-to-cart-modal" data-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i> Añadir al Carrito
                    </button>
                </div>
            </div>
        `;

        const modalMLOptions = modalBody.querySelectorAll('.ml-option');
        modalMLOptions.forEach(option => {
            option.addEventListener('click', function() {
                const productId = this.getAttribute('data-product');
                const container = this.closest('.modal-info');
                if (!container) return;
                
                container.querySelectorAll('.ml-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                
                this.classList.add('active');
                
                const priceDisplay = container.querySelector('.price-display');
                const price = this.getAttribute('data-price');
                if (priceDisplay) {
                    priceDisplay.textContent = formatPrice(price);
                }
            });
        });

        if (productImages.length > 1) {
            initGallery(productImages);
        }

        const consultBtn = modalBody.querySelector('.consult-whatsapp');
        const addToCartBtn = modalBody.querySelector('.add-to-cart-modal');

        if (consultBtn) {
            consultBtn.addEventListener('click', () => {
                // Obtener el ML y precio seleccionado para WhatsApp
                const selectedOption = modalBody.querySelector('.ml-option.active');
                let selectedPrice = product.price;
                let selectedML = null;
                
                if (selectedOption) {
                    selectedPrice = selectedOption.getAttribute('data-price');
                    selectedML = selectedOption.getAttribute('data-ml');
                } else if (prices.length > 0) {
                    selectedPrice = prices[0].price;
                    selectedML = prices[0].ml_amount;
                }
                
                consultWhatsApp(product, selectedML, selectedPrice);
            });
        }

        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', () => {
                // Obtener el ML y precio seleccionado para el carrito
                const selectedOption = modalBody.querySelector('.ml-option.active');
                let selectedPrice = product.price;
                let selectedML = null;
                
                if (selectedOption) {
                    selectedPrice = selectedOption.getAttribute('data-price');
                    selectedML = selectedOption.getAttribute('data-ml');
                } else if (prices.length > 0) {
                    selectedPrice = prices[0].price;
                    selectedML = prices[0].ml_amount;
                }
                
                // Pasar la información de ML al agregar al carrito
                addToCart(product, selectedML, selectedPrice);
                closeProductModal();
            });
        }

        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }

    } catch (error) {
        console.error('❌ Error opening product modal:', error);
        showToast('Error al cargar el producto', true);
    }
}

function initGallery(images) {
    const mainImg = document.getElementById('gallery-main-img');
    const thumbs = document.querySelectorAll('.gallery-thumb');
    const prevBtn = document.querySelector('.prev-gallery');
    const nextBtn = document.querySelector('.next-gallery');

    if (!mainImg || !thumbs.length) return;

    let currentIndex = 0;

    function updateGallery(index) {
        mainImg.src = images[index];

        thumbs.forEach((thumb, i) => {
            if (i === index) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });

        currentIndex = index;
    }

    thumbs.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            updateGallery(index);
        });
    });

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            let newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = images.length - 1;
            updateGallery(newIndex);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            let newIndex = currentIndex + 1;
            if (newIndex >= images.length) newIndex = 0;
            updateGallery(newIndex);
        });
    }
}

// FUNCIÓN CORREGIDA: Ahora usa el precio y ML seleccionados
function consultWhatsApp(product, selectedML = null, selectedPrice = null) {
    const phoneNumber = "5493584170048";
    
    // Usar el precio seleccionado si está disponible, sino el precio por defecto
    const priceToUse = selectedPrice || product.price;
    const mlInfo = selectedML ? ` (${selectedML} ML)` : '';
    
    const message = `Hola, estoy interesado en el perfume ${product.name}${mlInfo} (${formatPrice(priceToUse)}). ¿Podrían darme más información?`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappURL, '_blank');
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const closeModal = document.querySelector('.close-modal');
    const modal = document.getElementById('product-modal');

    if (closeModal && modal) {
        closeModal.addEventListener('click', closeProductModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeProductModal();
            }
        });
    }
});

console.log('✅ app.js cargado - listo para inicializar tienda');
