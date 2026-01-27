// js/components/Navbar.js
const { Package, Download, Images, CloudUpload } = lucide;

window.Navbar = ({ activeTab, setActiveTab, onExport, isExporting, onSaveCloud }) => {
    return (
        <header className="h-16 border-b border-white/10 bg-slate-900/50 backdrop-blur-md flex items-center px-6 justify-between sticky top-0 z-50">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30">
                     <i data-lucide="package" className="text-indigo-400 w-5 h-5"></i>
                </div>
                <h1 className="text-xl font-semibold text-white">Wite<span className="text-indigo-400">Hik</span></h1>
            </div>

            <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5">
                <button onClick={() => setActiveTab('mockups')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'mockups' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Мокапы</button>
                <button onClick={() => setActiveTab('products')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'products' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Товары</button>
                <button onClick={() => setActiveTab('base')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'base' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Галерея & Ссылки</button>
            </div>

            <div className="flex items-center gap-3 w-32 justify-end">
                {(activeTab === 'mockups' || activeTab === 'products') && (
                    <>
                        <button onClick={onSaveCloud} disabled={isExporting} title="Сохранить в облако" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 text-xs font-medium px-3 py-2 rounded-lg transition-all">
                            <i data-lucide="cloud-upload" className="w-4 h-4"></i>
                        </button>
                        <button onClick={onExport} disabled={isExporting} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg transition-all">
                            {isExporting ? <span className="animate-pulse">ZIP...</span> : <><i data-lucide="download" className="w-4 h-4"></i> <span>ZIP</span></>}
                        </button>
                    </>
                )}
            </div>
        </header>
    );
};