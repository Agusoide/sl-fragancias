
console.log('🔄 Cargando supabase-client.js...');

const SUPABASE_URL = 'https://qrfreqfvlcopgqtwgflk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyZnJlcWZ2bGNvcGdxdHdnZmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjMwOTQsImV4cCI6MjA3NjE5OTA5NH0.uRCBXb_uF9pIag5uOKvoRVwy_RXlzPq54tiLOdlowkA';

let supabaseClient;

try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Cliente Supabase inicializado correctamente');
    } else {
        console.error('❌ Supabase no está disponible globalmente');
        loadSupabaseFromCDN();
    }
} catch (error) {
    console.error('❌ Error inicializando Supabase:', error);
    loadSupabaseFromCDN();
}

function loadSupabaseFromCDN() {
    console.log('📥 Cargando Supabase desde CDN...');

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase cargado desde CDN e inicializado');
        initializeSupabaseClient();
    };
    script.onerror = () => {
        console.error('❌ Error cargando Supabase desde CDN');
        initializeSupabaseClient();
    };
    document.head.appendChild(script);
}

async function getProducts(filter = 'all', searchTerm = '') {
    console.log('📦 Obteniendo productos... Filtro:', filter, 'Búsqueda:', searchTerm);

    try {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase no inicializado - usando datos locales');
            return getLocalProducts(filter, searchTerm);
        }

        let query = supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (filter !== 'all') {
            query = query.eq('category', filter);
        }

        if (searchTerm && searchTerm.trim() !== '') {
            query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,section.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ Error en getProducts:', error);
            return getLocalProducts(filter, searchTerm);
        }

        // Asegurarse de que todos los productos tengan click_count
        const productsWithClickCount = data.map(product => ({
            ...product,
            click_count: product.click_count || 0
        }));

        console.log(`✅ ${productsWithClickCount?.length || 0} productos cargados desde Supabase`);
        return productsWithClickCount || [];

    } catch (error) {
        console.error('❌ Error en getProducts:', error);
        return getLocalProducts(filter, searchTerm);
    }
}

function getLocalProducts(filter = 'all', searchTerm = '') {
    console.log('🔄 Usando datos locales de respaldo...');

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
                "Intensidad: Alta",
                "Ocasion: Noche, Eventos Especiales"
            ],
            brand: "Aura",
            section: "Premium",
            images: [
                "https://images.unsplash.com/photo-1547887537-6158d64c35b3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
                "https://images.unsplash.com/photo-1595428774223-ef52624120d2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1152&q=80"
            ],
            created_at: new Date().toISOString()
        },
        {
            id: 2,
            name: "Coastal Mist",
            category: "men",
            price: "82.99",
            image: "https://images.unsplash.com/photo-1590736969955-71ac44642c74?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
            description: "Una fragancia fresca y masculina que evoca la brisa marina.",
            details: [
                "Notas de salida: Cardamomo, Menta, Limón",
                "Notas de corazón: Algas Marinas, Salvia, Lavanda",
                "Notas de fondo: Cedro, Almizcle, Ámbar Gris",
                "Duración: 6-8 horas",
                "Intensidad: Media-Alta",
                "Ocasion: Diario, Oficina, Reuniones"
            ],
            brand: "Aura",
            section: "Fresh",
            images: [
                "https://images.unsplash.com/photo-1590736969955-71ac44642c74?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80",
                "https://images.unsplash.com/photo-1615634260167-85aae787454a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80"
            ],
            created_at: new Date().toISOString()
        }
    ];

    let filtered = filter === 'all' ? localProducts : localProducts.filter(p => p.category === filter);

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term) ||
            p.section.toLowerCase().includes(term) ||
            p.brand.toLowerCase().includes(term)
        );
    }

    console.log(`📦 ${filtered.length} productos cargados desde datos locales`);
    return filtered;
}

async function getProductById(id) {
    try {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase no inicializado - buscando en datos locales');
            const localProducts = getLocalProducts('all', '');
            return localProducts.find(p => p.id === parseInt(id)) || null;
        }

        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('❌ Error en getProductById:', error);
        const localProducts = getLocalProducts('all', '');
        return localProducts.find(p => p.id === parseInt(id)) || null;
    }
}

async function createProduct(productData) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no inicializado');
        }

        const { data, error } = await supabaseClient
            .from('products')
            .insert([productData])
            .select();

        if (error) throw error;
        return data[0];

    } catch (error) {
        console.error('❌ Error en createProduct:', error);
        throw error;
    }
}

async function updateProduct(id, productData) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no inicializado');
        }

        const { data, error } = await supabaseClient
            .from('products')
            .update(productData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0];

    } catch (error) {
        console.error('❌ Error en updateProduct:', error);
        throw error;
    }
}

async function deleteProduct(id) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase no inicializado');
        }

        const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;

    } catch (error) {
        console.error('❌ Error en deleteProduct:', error);
        throw error;
    }
}

// ✅ AGREGAR ESTA FUNCIÓN FALTANTE
function validateLocalDiscountCode(code) {
    console.log('🔍 Validando código localmente:', code);

    const localDiscountCodes = {
        // Ejemplos (puedes agregar los que necesites)
        // 'CODIGO10': 10,
        // 'CODIGO20': 20,
    };

    const cleanCode = code.toUpperCase().trim();

    if (localDiscountCodes[cleanCode]) {
        return {
            valid: true,
            message: `¡Descuento del ${localDiscountCodes[cleanCode]}% aplicado! (Local)`,
            discount_percent: localDiscountCodes[cleanCode],
            code: cleanCode
        };
    }

    return {
        valid: false,
        message: 'Código de descuento no válido'
    };
}

async function validateDiscountCode(code) {
    try {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase no inicializado - validando código localmente');
            return validateLocalDiscountCode(code);
        }

        const { data, error } = await supabaseClient
            .from('discount_codes')
            .select('code, discount_percent, is_active')
            .eq('code', code.toUpperCase())
            .eq('is_active', true)
            .single();

        if (error || !data) {
            return { valid: false };
        }

        return {
            valid: true,
            message: `¡Descuento del ${data.discount_percent}% aplicado!`,
            discount_percent: data.discount_percent,
            code: data.code
        };

    } catch (error) {
        console.error('❌ Error en validateDiscountCode:', error);
        return validateLocalDiscountCode(code);
    }
}

function initializeSupabaseClient() {
    window.supabaseClient = {
        getProducts,
        getProductById,
        createProduct,
        updateProduct,
        deleteProduct,
        validateDiscountCode,
        supabase: supabaseClient
    };

    console.log('✅ supabase-client.js inicializado correctamente');
    console.log('🔧 Funciones disponibles:', Object.keys(window.supabaseClient));
}

if (supabaseClient) {
    initializeSupabaseClient();
}

console.log('✅ supabase-client.js cargado - listo para inicializar');
