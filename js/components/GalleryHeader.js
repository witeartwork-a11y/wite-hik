// js/components/GalleryHeader.js
window.GalleryHeader = ({ activeSubTab, onSubTabChange, filter, setFilter, dateFilter, setDateFilter, onWiteAiToggle, isWiteAiMode }) => {
    return (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-xl p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 justify-between items-start lg:items-center">
                
                {/* Tabs */}
                {onSubTabChange && (
                    <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50 backdrop-blur-sm shrink-0 w-full md:w-auto overflow-x-auto">
                        {[
                            { id: 'files', label: 'Исходники', icon: 'file-image' },
                            { id: 'publication', label: 'На публикацию', icon: 'upload-cloud' },
                            { id: 'cloud', label: 'Облако', icon: 'cloud' }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => onSubTabChange(tab.id)} 
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                                    ${activeSubTab === tab.id 
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
                )}

                <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
                    
                    {/* Wite AI Toggle (Only in Files tab) */}
                    {activeSubTab === 'files' && onWiteAiToggle && (
                        <button
                            onClick={onWiteAiToggle}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium w-full md:w-auto justify-center
                                ${isWiteAiMode 
                                    ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/30'
                                }
                            `}
                        >
                            <window.Icon name="link" className="w-4 h-4" />
                            <span>Wite AI</span>
                        </button>
                    )}

                    {/* Filters Group */}
                    <div className="flex items-center gap-3 w-full md:w-auto bg-slate-800/30 p-1 rounded-xl border border-slate-700/30">
                        {/* Search */}
                        <div className="relative group flex-1 md:w-64">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <window.Icon name="search" className="w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                placeholder={activeSubTab === 'cloud' ? "Поиск по артикулу..." : "Поиск файлов..."}
                                className="w-full bg-slate-900/50 border border-transparent focus:border-blue-500/50 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-200 outline-none transition-all placeholder-slate-600"
                            />
                        </div>

                        {/* Date Filter */}
                        {activeSubTab !== 'cloud' && (
                            <div className="relative border-l border-slate-700/50 pl-3">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <window.Icon name="calendar" className="w-4 h-4 text-slate-500" />
                                </div>
                                <select
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="bg-transparent text-slate-400 text-sm font-medium pl-8 pr-2 py-1.5 outline-none cursor-pointer hover:text-white transition-colors appearance-none"
                                >
                                    <option value="all" className="bg-slate-900">Все время</option>
                                    <option value="today" className="bg-slate-900">Сегодня</option>
                                    <option value="week" className="bg-slate-900">Неделя</option>
                                    <option value="month" className="bg-slate-900">Месяц</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
