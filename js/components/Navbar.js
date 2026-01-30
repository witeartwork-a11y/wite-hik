// js/components/Navbar.js
const { Package, Download, Images, CloudUpload, Table } = lucide;

window.Navbar = ({ activeTab, setActiveTab }) => {
    return (
        <header className="sticky top-0 z-50 px-4 pt-4 pb-2">
            <div className="max-w-[1920px] mx-auto bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/20 relative">
                <div className="flex flex-col md:flex-row justify-between items-center px-4 py-3 gap-4 relative z-10 min-h-[60px]">
                    
                    {/* Logo */}
                    <div className="flex items-center gap-3 shrink-0 md:flex-1">
                        <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-300">
                                <img src="favicon/favicon-32x32.png" className="w-6 h-6 object-contain brightness-0 invert" alt="Icon" /> 
                            </div>
                            <span className="font-bold text-white text-lg tracking-tight hidden lg:block">Wite-Hik</span>
                        </a>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                        {[
                            { id: 'mockups', label: 'Заготовки', icon: 'package' },
                            { id: 'products', label: 'Мокапы', icon: 'images' },
                            { id: 'base', label: 'Галерея', icon: 'cloud-upload' }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)} 
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                    ${activeTab === tab.id 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                    }
                                `}
                            >
                                <window.Icon name={tab.icon} className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Right Actions */}
                    <div className="flex justify-end md:flex-1 gap-2">
                         <a 
                            href="http://wb.wite-hik.ru" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-all border border-slate-700 hover:border-slate-600 shadow-lg shadow-black/20 group"
                        >
                            <window.Icon name="table" className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                            <span>Выгрузка Excel</span>
                        </a>
                    </div>
                </div>
            </div>
        </header>
    );
};