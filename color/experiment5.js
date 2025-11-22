// Reusing the logic from Experiment 2
const getComplementaryColor = (() => {
    function hexToHSL(hex) {
        // Handle rgb/rgba strings if needed, but for now assuming hex or simple named colors might be tricky
        // For this experiment we assume the input is coming from color picker (hex) or set as hex
        // If it's computed style, it will be rgb(...)
        
        // Simple hex parser
        if (hex.startsWith('#')) {
            hex = hex.replace(/^#/, '');
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            
            let r = parseInt(hex.substring(0, 2), 16) / 255;
            let g = parseInt(hex.substring(2, 4), 16) / 255;
            let b = parseInt(hex.substring(4, 6), 16) / 255;
            return rgbToHSL(r, g, b);
        } 
        
        // Handle rgb(r, g, b)
        const rgbMatch = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
            return rgbToHSL(
                parseInt(rgbMatch[1]) / 255,
                parseInt(rgbMatch[2]) / 255,
                parseInt(rgbMatch[3]) / 255
            );
        }

        return { h: 0, s: 0, l: 0 }; // Fallback
    }

    function rgbToHSL(r, g, b) {
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; 
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    return function(colorStr) {
        // We need to get the computed style if it's not a direct hex
        // But here we receive the value directly. 
        // If we are reading from style.backgroundColor, it will likely be rgb() or hex.
        
        const hsl = hexToHSL(colorStr);
        const newHue = (hsl.h + 180) % 360;
        return `hsl(${newHue}, ${hsl.s}%, ${hsl.l < 50 ? 90 : 10}%)`;
    };
})();

function updateElementColor(element) {
    // Get the current background color
    // We use computed style to get the actual visible color (which returns rgb usually)
    const style = window.getComputedStyle(element);
    const bgColor = style.backgroundColor;
    
    // If transparent, we might want to look up the tree, but for this experiment assume solid color
    if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') return;

    const newColor = getComplementaryColor(bgColor);
    
    // Avoid infinite loop if we are observing attributes and changing style
    if (element.style.color !== newColor) {
            element.style.color = newColor;
    }
}

export function autocolors(selector) {
    // 1. Initial pass
    document.querySelectorAll(selector).forEach(updateElementColor);

    // 2. Observer for attribute changes (style) on existing and future elements
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const target = mutation.target;
                if (target.matches(selector)) {
                    updateElementColor(target);
                }
            } else if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element
                        if (node.matches(selector)) {
                            updateElementColor(node);
                        }
                        // Also check children of added node
                        node.querySelectorAll(selector).forEach(updateElementColor);
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['style'], // Only listen to style changes
        childList: true,
        subtree: true
    });
};
