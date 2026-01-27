// js/components/Navbar.js
const { Package, Download, Images, CloudUpload } = lucide;

window.Navbar = ({ activeTab, setActiveTab }) => {
    return (
        <header className="h-16 glass flex items-center px-6 justify-between sticky top-0 z-50">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-500/20 p-2 rounded-xl border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                     <window.Icon name="package" className="text-indigo-400 w-6 h-6" />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">Wite<span className="text-indigo-400">Hik</span></h1>
            </div>

            <div className="flex bg-slate-900/50 p-1.5 rounded-xl border border-white/5 backdrop-blur-sm">
                <button onClick={() => setActiveTab('mockups')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'mockups' ? 'bg-indigo-500/20 text-indigo-300 shadow-sm ring-1 ring-indigo-500/50' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Заготовки</button>
                <button onClick={() => setActiveTab('products')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'products' ? 'bg-indigo-500/20 text-indigo-300 shadow-sm ring-1 ring-indigo-500/50' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Мокапы</button>
                <button onClick={() => setActiveTab('base')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'base' ? 'bg-indigo-500/20 text-indigo-300 shadow-sm ring-1 ring-indigo-500/50' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Галерея</button>
            </div>

            <div className="w-32"></div>
        </header>
    );
};