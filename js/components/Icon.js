// js/components/Icon.js
const Icon = ({ name, className, ...props }) => {
    const ref = React.useRef(null);

    React.useEffect(() => {
        if (!window.lucide) return;
        
        // Очищаем содержимое перед рендерингом
        if (ref.current) {
            ref.current.innerHTML = '';
            
            const i = document.createElement('i');
            i.setAttribute('data-lucide', name);
            if (className) {
                // Lucide copies classes from the original element to the SVG
                i.setAttribute('class', className);
            }
            
            ref.current.appendChild(i);
            
            try {
                window.lucide.createIcons({
                    root: ref.current,
                    nameAttr: 'data-lucide',
                    attrs: {
                        class: className
                    }
                });
            } catch (e) {
                console.error('Icon render error:', e);
            }
        }
    }, [name, className]);

    return (
        <span ref={ref} className={`icon-wrapper ${className || ''}`} style={{ display: 'inline-flex', ...props.style }} {...props}></span>
    );
};

window.Icon = Icon;
