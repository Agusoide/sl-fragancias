// admin-init.js - Solo para admin.html
console.log('🔧 Inicializando panel de administración...');
let allProducts = [];

// Variables globales para manejar imágenes
let imagesToDelete = [];
let currentEditingProduct = null;

function shouldInitializeAdmin() {
    return document.querySelector('.admin-container') ||
        window.location.pathname.includes('admin.html') ||
        window.location.pathname === '/admin.html';
}

function getSafeImageUrl(product) {
    if (product.image && product.image !== 'default-product.jpg') {
        return product.image;
    }
    return `data:image/svg+xml;base64,${btoa(`
        <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f8f9fa"/>
            <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#6c757d" 
                  text-anchor="middle" dy=".3em">${product.name || 'Sin Imagen'}</text>
        </svg>
    `)}`;
}

function showCustomConfirm(message, onConfirm, onCancel = null) {
    const confirmOverlay = document.createElement('div');
    confirmOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
    `;

    const confirmModal = document.createElement('div');
    confirmModal.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
        width: 90%;
        text-align: center;
    `;

    confirmModal.innerHTML = `
        <h3 style="margin: 0 0 1rem 0; color: #333;">Confirmar acción</h3>
        <p style="margin: 0 0 2rem 0; color: #666;">${message}</p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
            <button id="confirm-cancel" style="padding: 0.5rem 1.5rem; border: 1px solid #dc3545; background: white; color: #dc3545; border-radius: 4px; cursor: pointer;">Cancelar</button>
            <button id="confirm-ok" style="padding: 0.5rem 1.5rem; border: none; background: #dc3545; color: white; border-radius: 4px; cursor: pointer;">Eliminar</button>
        </div>
    `;

    confirmOverlay.appendChild(confirmModal);
    document.body.appendChild(confirmOverlay);

    document.getElementById('confirm-ok').addEventListener('click', () => {
        document.body.removeChild(confirmOverlay);
        onConfirm();
    });

    document.getElementById('confirm-cancel').addEventListener('click', () => {
        document.body.removeChild(confirmOverlay);
        if (onCancel) onCancel();
    });

    confirmOverlay.addEventListener('click', (e) => {
        if (e.target === confirmOverlay) {
            document.body.removeChild(confirmOverlay);
            if (onCancel) onCancel();
        }
    });
}

function resetSearchOnLoad() {
    const searchInput = document.getElementById('product-search');
    const clearSearchBtn = document.getElementById('clear-search');

    if (searchInput) {
        searchInput.value = '';
    }
    if (clearSearchBtn) {
        clearSearchBtn.style.display = 'none';
    }
}

// ========== FUNCIONES PARA PRECIOS POR ML ==========

// Función para agregar campo de precio
function addPriceField(ml = '', price = '') {
    const container = document.getElementById('prices-container');
    const priceItem = document.createElement('div');
    priceItem.className = 'price-item';
    priceItem.innerHTML = `
        <div class="price-inputs">
            <input type="number" class="ml-amount" placeholder="ML (ej: 50)" 
                   step="1" min="1" value="${ml}" ${ml === '' ? 'required' : ''}>
            <input type="number" class="price-value" placeholder="Precio ($)" 
                   step="0.01" min="0" value="${price}" ${price === '' ? 'required' : ''}>
        </div>
        <button type="button" class="remove-price">×</button>
    `;
    container.appendChild(priceItem);

    // Mostrar botón de eliminar solo si hay más de un precio
    updatePriceRemoveButtons();

    priceItem.querySelector('.remove-price').addEventListener('click', function () {
        priceItem.remove();
        updatePriceRemoveButtons();
    });
}

// Función para actualizar visibilidad de botones eliminar
function updatePriceRemoveButtons() {
    const priceItems = document.querySelectorAll('.price-item');
    const removeButtons = document.querySelectorAll('.remove-price');

    if (priceItems.length > 1) {
        removeButtons.forEach(btn => btn.style.display = 'block');
    } else {
        removeButtons.forEach(btn => btn.style.display = 'none');
    }
}

// Función para obtener los precios del formulario
function getPricesFromForm() {
    const priceItems = document.querySelectorAll('.price-item');
    const prices = [];

    priceItems.forEach(item => {
        const mlInput = item.querySelector('.ml-amount');
        const priceInput = item.querySelector('.price-value');
        const ml = parseFloat(mlInput.value);
        const price = parseFloat(priceInput.value);

        if (ml && price && !isNaN(ml) && !isNaN(price)) {
            prices.push({
                ml_amount: ml,
                price: price
            });
        }
    });

    return prices;
}

// Función para cargar precios existentes al editar
async function loadProductPrices(productId) {
    try {
        const { data: prices, error } = await window.supabaseClient.supabase
            .from('product_prices')
            .select('*')
            .eq('product_id', productId)
            .order('ml_amount', { ascending: true });

        if (error) throw error;

        return prices || [];
    } catch (error) {
        console.error('Error cargando precios:', error);
        return [];
    }
}

// Función para guardar precios
async function saveProductPrices(productId, prices) {
    try {
        // Eliminar precios existentes
        const { error: deleteError } = await window.supabaseClient.supabase
            .from('product_prices')
            .delete()
            .eq('product_id', productId);

        if (deleteError) throw deleteError;

        // Insertar nuevos precios si hay alguno
        if (prices.length > 0) {
            const pricesWithProductId = prices.map(price => ({
                ...price,
                product_id: productId
            }));

            const { error: insertError } = await window.supabaseClient.supabase
                .from('product_prices')
                .insert(pricesWithProductId);

            if (insertError) throw insertError;
        }

        return true;
    } catch (error) {
        console.error('Error guardando precios:', error);
        throw error;
    }
}

// ========== FIN FUNCIONES PRECIOS POR ML ==========

if (!shouldInitializeAdmin()) {
    console.log('⚠️ No es página de admin - omitiendo inicialización');
} else {
    console.log('✅ Estamos en panel de administración - inicializando...');

    async function initializeAdmin() {
        console.log('🔍 Verificando dependencias...');

        if (typeof window.supabaseClient === 'undefined') {
            console.error('❌ supabaseClient no disponible');
            showMessage('Error: supabaseClient no está disponible', 'error');
            return;
        }

        try {
            console.log('🔐 Verificando autenticación...');
            const { data: { session }, error } = await window.supabaseClient.supabase.auth.getSession();

            if (error || !session) {
                console.log('⚠️ No autenticado - redirigiendo...');
                window.location.href = 'admin-login.html';
                return;
            }

            console.log('✅ Usuario autenticado:', session.user.email);

            const adminEmailElement = document.getElementById('admin-email');
            if (adminEmailElement) {
                adminEmailElement.textContent = session.user.email;
            }

            removeOrdersSection();
            resetSearchOnLoad();
            setupAdminEventListeners();
            setupProductForm();
            setupDiscountForm();
            setupProductSearch();
            setupImageSorting();
            await loadAdminData();

            console.log('🎉 Panel de administración inicializado correctamente');

        } catch (error) {
            console.error('❌ Error inicializando admin:', error);
            showMessage('Error inicializando panel: ' + error.message, 'error');
        }
    }

    function removeOrdersSection() {
        const ordersNavItem = document.querySelector('[data-section="orders"]')?.closest('li');
        const ordersSection = document.getElementById('orders-section');

        if (ordersNavItem) ordersNavItem.remove();
        if (ordersSection) ordersSection.remove();

        console.log('✅ Sección de pedidos removida');
    }

    async function loadAdminData() {
        console.log('📊 Cargando datos del administrador...');

        try {
            const products = await window.supabaseClient.getProducts();
            console.log('📦 Productos cargados:', products.length);
            allProducts = products;
            displayAdminProducts(products);
            await loadDiscountCodes();

        } catch (error) {
            console.error('❌ Error cargando datos:', error);
        }
    }

    function setupAdminEventListeners() {
        console.log('🔧 Configurando event listeners del admin...');

        const addProductBtn = document.getElementById('add-product-btn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', function (e) {
                console.log('🟡 CLICK DETECTADO en botón Nuevo Producto');
                e.preventDefault();
                showProductModal();
            });
            console.log('✅ Event listener agregado para "Nuevo Producto"');
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                switchSection(section);
            });
        });

        const addDiscountBtn = document.getElementById('add-discount-btn');
        if (addDiscountBtn) {
            addDiscountBtn.addEventListener('click', showDiscountModal);
        }

        const closeModalButtons = document.querySelectorAll('.close-modal');
        closeModalButtons.forEach(button => {
            button.addEventListener('click', hideAllModals);
        });

        const cancelProductBtn = document.getElementById('cancel-product');
        if (cancelProductBtn) {
            cancelProductBtn.addEventListener('click', hideAllModals);
        }

        const cancelDiscountBtn = document.getElementById('cancel-discount');
        if (cancelDiscountBtn) {
            cancelDiscountBtn.addEventListener('click', hideAllModals);
        }

        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.addEventListener('click', hideAllModals);
        }

        console.log('✅ Event listeners del admin configurados');
    }

    function switchSection(section) {
        console.log('📁 Cambiando a sección:', section);

        if (section === 'products') {
            console.log('🔄 Cambiando a productos - reseteando búsqueda...');
            const searchInput = document.getElementById('product-search');
            const clearSearchBtn = document.getElementById('clear-search');

            if (searchInput) {
                searchInput.value = '';
            }
            if (clearSearchBtn) {
                clearSearchBtn.style.display = 'none';
            }

            displayAdminProducts(allProducts);

            const searchInfo = document.getElementById('search-info');
            const resultsCount = document.querySelector('.search-results-count');

            if (searchInfo) {
                searchInfo.innerHTML = 'Todos los productos';
            }
            if (resultsCount) {
                resultsCount.textContent = `${allProducts.length} ${allProducts.length === 1 ? 'producto' : 'productos'}`;
            }
        }

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

        document.querySelectorAll('.content-section').forEach(sectionEl => {
            sectionEl.classList.remove('active');
        });
        document.getElementById(`${section}-section`)?.classList.add('active');
    }

    async function handleLogout() {
        try {
            const { error } = await window.supabaseClient.supabase.auth.signOut();
            if (error) throw error;

            showMessage('Sesión cerrada correctamente', 'success');
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 1000);
        } catch (error) {
            console.error('❌ Error cerrando sesión:', error);
            showMessage('Error al cerrar sesión', 'error');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAdmin);
    } else {
        initializeAdmin();
    }
}

console.log('✅ admin-init.js cargado - verificando contexto...');

function setupDiscountForm() {
    const discountForm = document.getElementById('discount-form');
    if (discountForm) {
        discountForm.addEventListener('submit', handleDiscountSubmit);
        console.log('✅ Formulario de descuentos configurado');
    }
}

async function handleDiscountSubmit(e) {
    e.preventDefault();
    console.log('🔄 Enviando formulario de descuento...');

    try {
        const discountData = {
            code: document.getElementById('discount-code').value.toUpperCase(),
            discount_percent: parseInt(document.getElementById('discount-percent').value),
            is_active: true,
            created_at: new Date().toISOString()
        };

        console.log('📦 Guardando código de descuento:', discountData);

        const { data, error } = await window.supabaseClient.supabase
            .from('discount_codes')
            .insert([discountData])
            .select();

        if (error) {
            throw error;
        }

        console.log('✅ Código de descuento guardado:', data);
        showMessage('Código de descuento creado correctamente', 'success');
        hideAllModals();
        await loadDiscountCodes();

    } catch (error) {
        console.error('❌ Error guardando código de descuento:', error);
        showMessage('Error al crear código: ' + error.message, 'error');
    }
}

async function loadDiscountCodes() {
    try {
        const { data: discounts, error } = await window.supabaseClient.supabase
            .from('discount_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('🎫 Códigos de descuento cargados:', discounts?.length || 0);
        displayDiscountCodes(discounts || []);

    } catch (error) {
        console.error('❌ Error cargando códigos de descuento:', error);
    }
}

function displayDiscountCodes(discounts) {
    const container = document.getElementById('discounts-tbody');
    if (!container) return;

    container.innerHTML = discounts.map(discount => `
        <tr>
            <td><strong>${discount.code}</strong></td>
            <td>${discount.discount_percent}%</td>
            <td>
                <span class="status-badge ${discount.is_active ? 'active' : 'inactive'}">
                    ${discount.is_active ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>${new Date(discount.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteDiscountCode('${discount.id}')">
                    <i class="fas fa-trash"></i> 
                </button>
            </td>
        </tr>
    `).join('');
}

async function deleteDiscountCode(discountId) {
    showCustomConfirm(
        '¿Estás seguro de que quieres eliminar este código de descuento?',
        async () => {
            try {
                showMessage('Eliminando código...', 'info');

                const { error } = await window.supabaseClient.supabase
                    .from('discount_codes')
                    .delete()
                    .eq('id', discountId);

                if (error) throw error;

                console.log('✅ Código de descuento eliminado:', discountId);
                showMessage('Código de descuento eliminado', 'success');
                await loadDiscountCodes();

            } catch (error) {
                console.error('❌ Error eliminando código:', error);
                showMessage('Error al eliminar código: ' + error.message, 'error');
            }
        }
    );
}

function showProductModal() {
    console.log('🔄 Abriendo modal de producto...');

    // Limpiar variables temporales de imágenes
    imagesToDelete = [];
    currentEditingProduct = null;

    const modal = document.getElementById('product-modal');
    const overlay = document.getElementById('overlay');
    const imageUpload = document.getElementById('image-upload');
    const detailsContainer = document.getElementById('details-container');

    if (!modal) {
        console.error('❌ No se encontró el modal de producto');
        return;
    }

    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-modal-title').textContent = 'Nuevo Producto';
    document.getElementById('images-preview').innerHTML = '';
    document.getElementById('save-product').textContent = 'Guardar Producto';

    // Limpiar y resetear precios
    const pricesContainer = document.getElementById('prices-container');
    if (pricesContainer) {
        pricesContainer.innerHTML = '';
        addPriceField(); // Agregar un campo inicial
    }

    if (detailsContainer) {
        detailsContainer.innerHTML = '';
        addDetailField();
    }

    if (imageUpload) {
        imageUpload.value = '';
    }

    modal.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';

    console.log('✅ Modal de producto mostrado (completamente reseteado)');
}

function showDiscountModal() {
    const modal = document.getElementById('discount-modal');
    const overlay = document.getElementById('overlay');

    if (modal && overlay) {
        document.getElementById('discount-form').reset();

        modal.style.display = 'block';
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function hideAllModals() {
    console.log('🔄 Cerrando modales...');

    const modals = document.querySelectorAll('.modal');
    const overlay = document.getElementById('overlay');

    modals.forEach(modal => {
        modal.style.display = 'none';
    });

    if (overlay) {
        overlay.style.display = 'none';
    }

    document.body.style.overflow = '';

    console.log('✅ Modales cerrados');
}

function setupProductForm() {
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
        console.log('✅ Formulario de producto configurado');
    }

    // Configurar botón para agregar precios
    const addPriceBtn = document.getElementById('add-price-btn');
    if (addPriceBtn) {
        addPriceBtn.addEventListener('click', () => addPriceField());
        console.log('✅ Botón agregar precio configurado');
    }

    const uploadArea = document.getElementById('upload-area');
    const imageUpload = document.getElementById('image-upload');

    if (uploadArea && imageUpload) {
        uploadArea.addEventListener('click', () => {
            console.log('🖱️ Click en área de upload');
            imageUpload.click();
        });

        imageUpload.addEventListener('change', (e) => {
            console.log('📁 Archivos seleccionados:', e.target.files.length);

            const existingFiles = Array.from(imageUpload.files);
            const newFiles = Array.from(e.target.files);

            const allFiles = [...existingFiles];
            newFiles.forEach(newFile => {
                const isDuplicate = allFiles.some(existingFile =>
                    existingFile.name === newFile.name && existingFile.size === newFile.size
                );
                if (!isDuplicate) {
                    allFiles.push(newFile);
                }
            });

            const dt = new DataTransfer();
            allFiles.forEach(file => dt.items.add(file));
            imageUpload.files = dt.files;

            console.log('📁 Total de archivos después de combinar:', imageUpload.files.length);
            handleImageUpload(newFiles);
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            console.log('📁 Archivos arrastrados:', e.dataTransfer.files.length);

            const existingFiles = Array.from(imageUpload.files);
            const newFiles = Array.from(e.dataTransfer.files);
            const allFiles = [...existingFiles, ...newFiles];

            const dt = new DataTransfer();
            allFiles.forEach(file => dt.items.add(file));
            imageUpload.files = dt.files;

            handleImageUpload(newFiles);
        });
    }

    const addDetailBtn = document.getElementById('add-detail-btn');
    if (addDetailBtn) {
        addDetailBtn.addEventListener('click', addDetailField);
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    console.log('🔄 Enviando formulario de producto...');

    try {
        const productId = document.getElementById('product-id').value;
        const isEditing = !!productId;

        // Obtener precios del formulario
        const prices = getPricesFromForm();
        if (prices.length === 0) {
            showMessage('Debe agregar al menos un precio por ML', 'error');
            return;
        }

        const detailInputs = document.querySelectorAll('.detail-input');
        const fragranceDetails = Array.from(detailInputs)
            .map(input => input.value.trim())
            .filter(detail => detail.length > 0);

        console.log('📋 Detalles capturados:', fragranceDetails);
        console.log('💰 Precios por ML capturados:', prices);

        // SUBIR NUEVAS IMÁGENES
        const newUploadedImages = await uploadProductImages();
        
        // MANEJAR IMÁGENES EXISTENTES Y NUEVAS
        let finalImages = [];
        
        if (isEditing) {
            // Obtener imágenes existentes que no fueron eliminadas
            const existingImageInputs = document.querySelectorAll('input[name="existing-images"]');
            const remainingExistingImages = Array.from(existingImageInputs).map(input => input.value);
            
            // Combinar imágenes existentes (no eliminadas) con nuevas
            finalImages = [...remainingExistingImages, ...newUploadedImages];
            
            // Eliminar imágenes marcadas para borrar del storage
            if (imagesToDelete.length > 0) {
                await deleteImagesFromStorage(imagesToDelete);
            }
        } else {
            finalImages = newUploadedImages;
        }

        console.log('🖼️ Imágenes finales:', finalImages);

        const productData = {
            name: document.getElementById('product-name').value,
            category: document.getElementById('product-category').value || 'women',
            brand: document.getElementById('product-brand').value,
            description: document.getElementById('product-description').value,
            details: fragranceDetails,
            image: finalImages.length > 0 ? finalImages[0] : null,
            images: finalImages.length > 0 ? finalImages : null
        };

        // VALIDACIÓN MEJORADA:
        if (!productData.name || productData.name.trim() === '') {
            showMessage('El nombre del producto es obligatorio', 'error');
            return;
        }

        if (!productData.category) {
            showMessage('La categoría es obligatoria', 'error');
            return;
        }

        // Remover campos vacíos o nulos
        Object.keys(productData).forEach(key => {
            if (productData[key] === null || productData[key] === undefined ||
                (Array.isArray(productData[key]) && productData[key].length === 0)) {
                delete productData[key];
            }
        });

        console.log('📦 Datos del producto a guardar:', productData);

        let result;
        if (isEditing) {
            console.log('📝 Actualizando producto existente:', productId);
            result = await window.supabaseClient.supabase
                .from('products')
                .update(productData)
                .eq('id', productId)
                .select();
        } else {
            console.log('🆕 Creando nuevo producto');
            result = await window.supabaseClient.supabase
                .from('products')
                .insert([productData])
                .select();
        }

        const { data, error } = result;

        if (error) {
            throw error;
        }

        const savedProduct = data[0];
        console.log('✅ Producto guardado en Supabase:', savedProduct);

        // Guardar los precios por ML
        await saveProductPrices(savedProduct.id, prices);

        // Limpiar variables temporales
        imagesToDelete = [];
        currentEditingProduct = null;

        console.log('✅ Precios por ML guardados');
        showMessage(`Producto ${isEditing ? 'actualizado' : 'creado'} correctamente`, 'success');
        hideAllModals();
        await reloadAdminProducts();

    } catch (error) {
        console.error('❌ Error guardando producto:', error);
        showMessage('Error al guardar el producto: ' + error.message, 'error');
    }
}

// NUEVA FUNCIÓN: Eliminar imágenes del storage
async function deleteImagesFromStorage(imageUrls) {
    try {
        console.log('🗑️ Eliminando imágenes del storage:', imageUrls);
        
        for (const imageUrl of imageUrls) {
            // Extraer el path del archivo de la URL
            const pathMatch = imageUrl.match(/product-images\/([^?]+)/);
            if (pathMatch) {
                const filePath = pathMatch[0];
                const { error } = await window.supabaseClient.supabase.storage
                    .from('product-images')
                    .remove([filePath]);
                
                if (error) {
                    console.error('❌ Error eliminando imagen:', filePath, error);
                } else {
                    console.log('✅ Imagen eliminada del storage:', filePath);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error en eliminación de imágenes:', error);
    }
}

// NUEVA FUNCIÓN: Agregar imagen existente al preview con funcionalidad completa
function addExistingImageToPreview(imageUrl, index, isExisting = false) {
    const preview = document.getElementById('images-preview');
    const imgContainer = document.createElement('div');
    imgContainer.className = 'image-preview-item';
    imgContainer.setAttribute('data-image-url', imageUrl);
    imgContainer.setAttribute('data-existing', isExisting);
    imgContainer.draggable = true;
    
    const imageName = isExisting ? `Imagen ${index + 1}` : 'Nueva imagen';
    
    imgContainer.innerHTML = `
        <div class="order-indicator">${index + 1}</div>
        <div class="preview-header">
            <span class="image-name">${imageName}</span>
            <button type="button" class="remove-image">×</button>
        </div>
        <img src="${imageUrl}" alt="Imagen del producto">
        <div class="image-info">${isExisting ? 'Imagen existente' : 'Imagen nueva'}</div>
        ${isExisting ? '<input type="hidden" name="existing-images" value="' + imageUrl + '">' : ''}
    `;
    
    preview.appendChild(imgContainer);

    // Configurar evento para eliminar imagen
    imgContainer.querySelector('.remove-image').addEventListener('click', function(e) {
        e.stopPropagation();
        removeImageFromPreview(this, isExisting, imageUrl);
    });

    updateImageOrder();
}

// NUEVA FUNCIÓN: Eliminar imagen del preview
function removeImageFromPreview(button, isExisting, imageUrl) {
    const imgContainer = button.closest('.image-preview-item');
    
    if (isExisting) {
        // Marcar imagen existente para eliminación
        imagesToDelete.push(imageUrl);
        console.log('🗑️ Imagen marcada para eliminación:', imageUrl);
    }
    
    imgContainer.remove();
    updateUploadAreaFeedback();
    updateImageOrder();
}

async function reloadAdminProducts() {
    try {
        console.log('🔄 Recargando productos desde la base de datos...');

        const products = await window.supabaseClient.getProducts();
        allProducts = products;

        const searchInput = document.getElementById('product-search');
        const currentSearchTerm = searchInput ? searchInput.value.trim() : '';

        console.log('📦 Productos recargados:', products.length);
        console.log('🔍 Término de búsqueda actual:', currentSearchTerm);

        if (currentSearchTerm) {
            console.log('🔄 Re-aplicando búsqueda:', currentSearchTerm);
            searchProducts(currentSearchTerm);
        } else {
            console.log('📋 Mostrando todos los productos');
            displayAdminProducts(allProducts);
        }

    } catch (error) {
        console.error('❌ Error recargando productos:', error);
    }
}

function formatPrice(price) {
    // Convertir a número y formatear con separadores de miles y decimales
    const number = parseFloat(price);
    return '$' + number.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Función auxiliar para mostrar el rango de precios
function getPriceRange(prices) {
    if (!prices || prices.length === 0) return 'Sin precios';

    const minPrice = Math.min(...prices.map(p => p.price));
    const maxPrice = Math.max(...prices.map(p => p.price));

    if (minPrice === maxPrice) {
        return formatPrice(minPrice);
    } else {
        return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
    }
}

function displayAdminProducts(products) {
    const container = document.getElementById('admin-products-container');
    if (!container) {
        console.error('❌ No se encontró el contenedor de productos');
        return;
    }

    console.log('🖼️ Mostrando productos:', products.length);

    // Para cada producto, cargar sus precios y luego mostrar
    Promise.all(products.map(async (product) => {
        const prices = await loadProductPrices(product.id);
        return { ...product, prices };
    })).then(productsWithPrices => {
        container.innerHTML = productsWithPrices.map(product => `
            <div class="admin-product-card">
                <div class="product-image">
                    <img src="${getSafeImageUrl(product)}" alt="${product.name}">
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-brand">${product.brand || 'Sin marca'}</p>
                    <p class="product-price">${getPriceRange(product.prices)}</p>
                    <p class="product-category">${product.category || 'Sin categoría'}</p>
                    <p class="product-ml-variants">${product.prices?.length || 0} ${product.prices?.length === 1 ? 'variante' : 'variantes'} de ML</p>
                </div>
                <div class="product-actions">
                    <button class="btn btn-edit" onclick="editProduct('${product.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-delete" onclick="deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    });
}

async function deleteProduct(productId) {
    console.log('🗑️ Eliminando producto:', productId);

    showCustomConfirm(
        '¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.',
        async () => {
            try {
                showMessage('Eliminando producto...', 'info');

                // Eliminar primero los precios asociados
                const { error: pricesError } = await window.supabaseClient.supabase
                    .from('product_prices')
                    .delete()
                    .eq('product_id', productId);

                if (pricesError) throw pricesError;

                // Luego eliminar el producto
                const { error } = await window.supabaseClient.supabase
                    .from('products')
                    .delete()
                    .eq('id', productId);

                if (error) {
                    throw error;
                }

                console.log('✅ Producto eliminado:', productId);
                showMessage('Producto eliminado correctamente', 'success');
                await reloadAdminProducts();

            } catch (error) {
                console.error('❌ Error eliminando producto:', error);
                showMessage('Error al eliminar el producto: ' + error.message, 'error');
            }
        }
    );
}

async function editProduct(productId) {
    console.log('✏️ Editando producto:', productId);

    try {
        const { data: product, error } = await window.supabaseClient.supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;
        if (!product) {
            showMessage('Producto no encontrado', 'error');
            return;
        }

        // Guardar referencia a las imágenes existentes
        currentEditingProduct = {
            id: productId,
            existingImages: product.images || []
        };

        // Cargar datos básicos del producto
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-category').value = product.category || 'women';
        document.getElementById('product-brand').value = product.brand || '';
        document.getElementById('product-description').value = product.description || '';

        // Limpiar y cargar precios existentes
        const pricesContainer = document.getElementById('prices-container');
        if (pricesContainer) {
            pricesContainer.innerHTML = '';

            const prices = await loadProductPrices(productId);
            if (prices.length > 0) {
                prices.forEach(price => {
                    addPriceField(price.ml_amount, price.price);
                });
            } else {
                // Agregar un campo vacío si no hay precios
                addPriceField();
            }
        }

        // Cargar detalles existentes
        const detailsContainer = document.getElementById('details-container');
        if (detailsContainer) {
            detailsContainer.innerHTML = '';

            if (product.details && Array.isArray(product.details) && product.details.length > 0) {
                console.log('📋 Cargando detalles existentes:', product.details);

                product.details.forEach(detail => {
                    if (detail && detail.trim() !== '') {
                        addDetailFieldWithValue(detail.trim());
                    }
                });
            } else {
                console.log('ℹ️ No hay detalles existentes, agregando campo vacío');
                addDetailField();
            }
        }

        // MOSTRAR IMÁGENES EXISTENTES CON BOTÓN DE ELIMINAR FUNCIONAL
        const imagesPreview = document.getElementById('images-preview');
        if (imagesPreview) {
            imagesPreview.innerHTML = '';
            
            if (product.images && Array.isArray(product.images)) {
                product.images.forEach((imageUrl, index) => {
                    addExistingImageToPreview(imageUrl, index, true);
                });
            }
            
            updateUploadAreaFeedback();
        }

        document.getElementById('product-modal-title').textContent = 'Editar Producto';
        document.getElementById('save-product').textContent = 'Actualizar Producto';

        const modal = document.getElementById('product-modal');
        const overlay = document.getElementById('overlay');

        modal.style.display = 'block';
        if (overlay) overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';

        showMessage(`Editando: ${product.name}`, 'info');

    } catch (error) {
        console.error('❌ Error cargando producto para editar:', error);
        showMessage('Error al cargar el producto: ' + error.message, 'error');
    }
}

function addDetailFieldWithValue(value = '') {
    const container = document.getElementById('details-container');
    const detailItem = document.createElement('div');
    detailItem.className = 'detail-item';
    detailItem.innerHTML = `
        <input type="text" class="detail-input" placeholder="Ej: Notas de salida: Bergamota" value="${value}">
        <button type="button" class="remove-detail">×</button>
    `;
    container.appendChild(detailItem);

    detailItem.querySelector('.remove-detail').addEventListener('click', () => {
        detailItem.remove();
    });
}

function addDetailField() {
    addDetailFieldWithValue('');
}

function handleImageUpload(files) {
    const preview = document.getElementById('images-preview');
    const uploadArea = document.getElementById('upload-area');

    if (!preview || !uploadArea) {
        console.error('❌ No se encontraron elementos necesarios');
        return;
    }

    console.log('🖼️ Procesando', files.length, 'archivos para preview');

    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) {
            console.warn('❌ Archivo no es imagen:', file.name);
            return;
        }

        const existingImages = Array.from(preview.querySelectorAll('.image-name'))
            .map(el => el.textContent);

        if (existingImages.includes(file.name)) {
            console.log('⚠️ Imagen ya existe en preview:', file.name);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            addNewImageToPreview(file.name, e.target.result, file.size);
        };
        reader.readAsDataURL(file);
    });

    updateUploadAreaFeedback();
    updateImageOrder();
}

// NUEVA FUNCIÓN: Agregar nueva imagen al preview
function addNewImageToPreview(filename, dataUrl, fileSize) {
    const preview = document.getElementById('images-preview');
    const imgContainer = document.createElement('div');
    imgContainer.className = 'image-preview-item';
    imgContainer.draggable = true;
    
    imgContainer.innerHTML = `
        <div class="order-indicator">${preview.children.length + 1}</div>
        <div class="preview-header">
            <span class="image-name">${filename}</span>
            <button type="button" class="remove-image">×</button>
        </div>
        <img src="${dataUrl}" alt="Preview de ${filename}">
        <div class="image-info">${(fileSize / 1024).toFixed(1)} KB - Nueva imagen</div>
    `;
    
    preview.appendChild(imgContainer);

    // Configurar evento para eliminar imagen
    imgContainer.querySelector('.remove-image').addEventListener('click', function(e) {
        e.stopPropagation();
        removeNewImageFromPreview(this, filename);
    });
}

// NUEVA FUNCIÓN: Eliminar nueva imagen del preview
function removeNewImageFromPreview(button, filename) {
    const imgContainer = button.closest('.image-preview-item');
    
    // Remover el archivo del input file
    const imageUpload = document.getElementById('image-upload');
    if (imageUpload && imageUpload.files) {
        const dt = new DataTransfer();
        const files = Array.from(imageUpload.files);
        
        files.forEach(file => {
            if (file.name !== filename) {
                dt.items.add(file);
            }
        });
        
        imageUpload.files = dt.files;
        console.log('🗑️ Imagen nueva removida del input:', filename);
    }
    
    imgContainer.remove();
    updateUploadAreaFeedback();
    updateImageOrder();
}

function updateUploadAreaFeedback() {
    const uploadArea = document.getElementById('upload-area');
    const preview = document.getElementById('images-preview');

    if (!uploadArea || !preview) return;

    const totalImages = preview.querySelectorAll('.image-preview-item').length;
    const uploadText = uploadArea.querySelector('p');

    if (totalImages === 0) {
        uploadText.textContent = 'Arrastra imágenes aquí o haz clic para seleccionar';
        uploadArea.classList.remove('multiple-selected');
    } else if (totalImages === 1) {
        uploadText.textContent = '1 imagen seleccionada';
        uploadArea.classList.remove('multiple-selected');
    } else {
        uploadText.textContent = `${totalImages} imágenes seleccionadas`;
        uploadArea.classList.add('multiple-selected');
    }
}

function showMessage(message, type = 'info') {
    const colors = {
        'success': '#28a745',
        'error': '#dc3545',
        'info': '#17a2b8',
        'warning': '#ffc107'
    };

    const existingMessages = document.querySelectorAll('.admin-message');
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = 'admin-message';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${colors[type] || colors.info};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
    `;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

function setupProductSearch() {
    const searchInput = document.getElementById('product-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const searchContainer = document.querySelector('.search-container');

    if (!searchInput) {
        console.log('⚠️ Buscador no encontrado en el DOM');
        return;
    }

    let searchTimeout;

    searchInput.addEventListener('input', function (e) {
        const searchTerm = e.target.value.trim();
        const searchBox = this.closest('.search-box');

        if (clearSearchBtn) {
            if (searchTerm) {
                clearSearchBtn.style.display = 'flex';
                clearSearchBtn.style.opacity = '1';
            } else {
                clearSearchBtn.style.opacity = '0';
                setTimeout(() => {
                    clearSearchBtn.style.display = 'none';
                }, 300);
            }
        }

        if (searchContainer) {
            searchContainer.classList.add('search-loading');
        }

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (searchTerm.length >= 2 || searchTerm.length === 0) {
                searchProducts(searchTerm);
            }

            if (searchContainer) {
                searchContainer.classList.remove('search-loading');
            }
        }, 400);
    });

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function () {
            searchInput.value = '';
            searchInput.focus();
            searchProducts('');

            this.style.opacity = '0';
            setTimeout(() => {
                this.style.display = 'none';
            }, 300);
        });
    }

    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchProducts(this.value.trim());
        }
    });

    searchInput.addEventListener('focus', function () {
        this.closest('.search-box').style.boxShadow = '0 0 0 3px rgba(200, 169, 126, 0.2)';
    });

    searchInput.addEventListener('blur', function () {
        this.closest('.search-box').style.boxShadow = '';
    });

    console.log('✅ Sistema de búsqueda profesional configurado');
}

function searchProducts(searchTerm) {
    const container = document.getElementById('admin-products-container');
    const searchInfo = document.getElementById('search-info');
    const resultsCount = document.querySelector('.search-results-count');

    if (!allProducts || allProducts.length === 0) {
        console.log('⚠️ No hay productos cargados para buscar');
        return;
    }

    let filteredProducts = allProducts;

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredProducts = allProducts.filter(product =>
            product.name.toLowerCase().includes(term) ||
            (product.brand && product.brand.toLowerCase().includes(term)) ||
            (product.category && product.category.toLowerCase().includes(term)) ||
            (product.description && product.description.toLowerCase().includes(term))
        );
    }

    if (searchInfo) {
        if (searchTerm) {
            searchInfo.innerHTML = `Resultados para "<strong class="search-highlight">${searchTerm}</strong>"`;
        } else {
            searchInfo.innerHTML = 'Todos los productos';
        }
    }

    if (resultsCount) {
        resultsCount.textContent = `${filteredProducts.length} ${filteredProducts.length === 1 ? 'producto' : 'productos'}`;
    }

    displayAdminProducts(filteredProducts);

    if (filteredProducts.length === 0 && searchTerm) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No se encontraron productos</h3>
                <p>No hay productos que coincidan con "<strong>${searchTerm}</strong>"</p>
                <button class="btn btn-primary" onclick="clearSearch()">
                    <i class="fas fa-times"></i> Limpiar búsqueda
                </button>
            </div>
        `;
    }

    console.log(`🔍 Búsqueda: "${searchTerm}" - ${filteredProducts.length} resultados`);
}

function clearSearch() {
    const searchInput = document.getElementById('product-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const searchInfo = document.getElementById('search-info');
    const resultsCount = document.querySelector('.search-results-count');

    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }

    if (clearSearchBtn) {
        clearSearchBtn.style.display = 'none';
    }

    if (searchInfo) {
        searchInfo.innerHTML = 'Todos los productos';
    }

    if (resultsCount) {
        resultsCount.textContent = `${allProducts.length} ${allProducts.length === 1 ? 'producto' : 'productos'}`;
    }

    searchProducts('');

    console.log('🧹 Búsqueda limpiada');
}

function setupImageSorting() {
    const preview = document.getElementById('images-preview');
    if (!preview) return;

    let draggedItem = null;

    preview.addEventListener('dragstart', function (e) {
        if (e.target.closest('.image-preview-item')) {
            draggedItem = e.target.closest('.image-preview-item');
            setTimeout(() => draggedItem.classList.add('dragging'), 0);
        }
    });

    preview.addEventListener('dragend', function () {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            updateImageOrder();
        }
    });

    preview.addEventListener('dragover', function (e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(preview, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (draggable) {
            if (afterElement == null) {
                preview.appendChild(draggable);
            } else {
                preview.insertBefore(draggable, afterElement);
            }
        }
    });

    console.log('✅ Sistema de ordenamiento de imágenes configurado');
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.image-preview-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateImageOrder() {
    const preview = document.getElementById('images-preview');
    const items = preview.querySelectorAll('.image-preview-item');

    items.forEach((item, index) => {
        const indicator = item.querySelector('.order-indicator') || document.createElement('div');
        if (!indicator.classList.contains('order-indicator')) {
            indicator.className = 'order-indicator';
            item.appendChild(indicator);
        }
        indicator.textContent = index + 1;
    });

    console.log('🔄 Orden de imágenes actualizado');
}

async function uploadProductImages() {
    const imageUpload = document.getElementById('image-upload');
    const preview = document.getElementById('images-preview');
    const uploadedImages = [];

    if (!imageUpload || !imageUpload.files.length) {
        console.log('⚠️ No hay imágenes para subir');
        return uploadedImages;
    }

    try {
        showMessage('Subiendo imágenes...', 'info');
        console.log(`📤 Iniciando subida de ${imageUpload.files.length} imagen(es)`);

        const previewItems = Array.from(preview.querySelectorAll('.image-preview-item'));
        const imageOrder = previewItems.map(item =>
            item.querySelector('.image-name').textContent
        );

        console.log('🔄 Orden de imágenes:', imageOrder);

        const orderedFiles = [];
        imageOrder.forEach(filename => {
            const file = Array.from(imageUpload.files).find(f => f.name === filename);
            if (file) {
                orderedFiles.push(file);
                console.log(`📋 Ordenando: ${filename} -> posición ${orderedFiles.length}`);
            }
        });

        for (let i = 0; i < orderedFiles.length; i++) {
            const file = orderedFiles[i];

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}_${i}.${fileExt}`;
            const filePath = `product-images/${fileName}`;

            console.log(`📤 Subiendo imagen ${i + 1}/${orderedFiles.length}: ${file.name}`);

            const { data, error } = await window.supabaseClient.supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (error) {
                console.error('❌ Error subiendo imagen:', error);
                continue;
            }

            const { data: { publicUrl } } = window.supabaseClient.supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            uploadedImages.push(publicUrl);
            console.log(`✅ Imagen ${i + 1} subida:`, publicUrl);
        }

        console.log(`🎉 Subida completada: ${uploadedImages.length} imagen(es) subida(s) en orden`);

        if (uploadedImages.length > 0) {
            showMessage(`${uploadedImages.length} imagen(es) subida(s) correctamente`, 'success');
        } else {
            showMessage('No se pudieron subir las imágenes', 'warning');
        }

        return uploadedImages;

    } catch (error) {
        console.error('❌ Error en subida de imágenes:', error);
        showMessage('Error al subir imágenes', 'error');
        return uploadedImages;
    }
}

async function createStorageBucket() {
    try {
        const { data, error } = await window.supabaseClient.supabase.storage.createBucket('product-images', {
            public: true,
            fileSizeLimit: 5242880,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        });

        if (error && error.message.includes('already exists')) {
            console.log('✅ Bucket product-images ya existe');
        } else if (error) {
            throw error;
        } else {
            console.log('✅ Bucket product-images creado:', data);
        }
    } catch (error) {
        console.error('❌ Error creando bucket:', error);
    }
}

async function diagnoseProductImages() {
    try {
        console.log('🔍 DIAGNÓSTICO DE IMÁGENES:');

        const { data: products, error } = await window.supabaseClient.supabase
            .from('products')
            .select('id, name, image, images');

        if (error) throw error;

        products.forEach(product => {
            console.log(`📦 Producto: ${product.name} (ID: ${product.id})`);
            console.log(`   🖼️ image: ${product.image}`);
            console.log(`   🖼️ images: ${product.images}`);
            console.log(`   📊 Tipo de images: ${typeof product.images}`);
        });

    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
    }
}
