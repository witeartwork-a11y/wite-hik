// js/components/Navbar.js
const { Package, Download, Images, CloudUpload } = lucide;

window.Navbar = ({ activeTab, setActiveTab }) => {
    return (
        <header className="h-16 glass flex items-center px-6 justify-between fixed top-0 left-0 right-0 z-50 w-full">
            <div className="flex items-center gap-3">
                <img src="favicon/favicon-32x32.png" className="w-8 h-8 object-contain rounded-full shadow-sm" alt="Icon" />
                <img src="favicon/logo.png" className="h-8 object-contain" alt="WiteHik Logo" />
            </div>

            <div className="flex bg-slate-900/50 p-1.5 rounded-xl border border-white/5 backdrop-blur-sm">
                <button onClick={() => setActiveTab('mockups')} className={`tab-button ${activeTab === 'mockups' ? 'tab-active' : 'tab-inactive'}`}>Заготовки</button>
                <button onClick={() => setActiveTab('products')} className={`tab-button ${activeTab === 'products' ? 'tab-active' : 'tab-inactive'}`}>Мокапы</button>
                <button onClick={() => setActiveTab('base')} className={`tab-button ${activeTab === 'base' ? 'tab-active' : 'tab-inactive'}`}>Исходники</button>
            </div>

            <div className="w-32"></div>
        </header>
    );
};