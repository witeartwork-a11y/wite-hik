// js/components/GalleryHeader.js
window.GalleryHeader = ({ activeSubTab, onSubTabChange, filter, setFilter, dateFilter, setDateFilter }) => {
    return (
        <div className="glass-card rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-start md:items-center">
                {/* Переключатель вкладок */}
                {onSubTabChange && (
                    <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5 shrink-0">
                        <button 
                            onClick={() => onSubTabChange('files')} 
                            className={`tab-button ${activeSubTab === 'files' ? 'tab-active' : 'tab-inactive'}`}
                        >
                            Исходники
                        </button>
                        <button 
                            onClick={() => onSubTabChange('publication')} 
                            className={`tab-button ${activeSubTab === 'publication' ? 'tab-active' : 'tab-inactive'}`}
                        >
                            На публикацию
                        </button>
                        <button 
                            onClick={() => onSubTabChange('cloud')} 
                            className={`tab-button ${activeSubTab === 'cloud' ? 'tab-active' : 'tab-inactive'}`}
                        >
                            Облако
                        </button>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto justify-end flex-wrap md:flex-nowrap">
                {/* Фильтр по названию */}
                {activeSubTab !== 'cloud' && (
                    <div className="search-box group w-full md:w-64 order-2 md:order-1">
                        <window.Icon name="search" className="search-icon" />
                        <input
                            type="text"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Поиск файлов..."
                            className="input-field text-sm"
                        />
                    </div>
                )}

                {/* Фильтр по дате */}
                <div className="flex items-center gap-2 order-3">
                    <i data-lucide="calendar" className="w-4 h-4 text-slate-500"></i>
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500/50 cursor-pointer hover:bg-slate-800 transition-colors"
                    >
                        <option value="all">За все время</option>
                        <option value="today">Сегодня</option>
                        <option value="week">За неделю</option>
                        <option value="month">За месяц</option>
                    </select>
                </div>

                {/* Для облака - поиск по артикулу */}
                {activeSubTab === 'cloud' && (
                    <div className="search-box group w-full md:w-64">
                        <window.Icon name="search" className="search-icon" />
                        <input
                            type="text"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Поиск по артикулу..."
                            className="input-field text-sm"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
