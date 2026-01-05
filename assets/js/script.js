// =========================================================================
// 0. 立即执行逻辑 (辅助 Head 脚本)
// =========================================================================
(function() {
    if (sessionStorage.getItem('is-transitioning')) {
        // 隐藏光标
        document.documentElement.style.cursor = 'none';
        
        // 仅锁定幕布和中间的 Logo (左上角 Logo 已由 CSS 默认处理)
        var curtain = document.getElementById('transition-curtain');
        if (curtain) {
            curtain.style.transform = 'translateX(0)';
            curtain.style.transition = 'none';
            curtain.classList.add('is-active');
        }
        var centerLogo = document.getElementById('t-logo-center');
        if (centerLogo) {
            centerLogo.style.opacity = '1';
            centerLogo.style.transform = 'translateX(0)';
            centerLogo.style.transition = 'none';
        }
    }
})();

// =========================================================================
// 1. 核心设置
// =========================================================================
if (history.scrollRestoration) { history.scrollRestoration = 'manual'; }
window.scrollTo(0, 0);

window.lenis = new Lenis({
    duration: 1.2, 
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
    smooth: true
});
function raf(time) { window.lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
window.lenis.stop();

// =========================================================================
// 2. 主逻辑
// =========================================================================
document.addEventListener("DOMContentLoaded", function() {

    const curtain = document.getElementById('transition-curtain');
    const loadingMask = document.getElementById('loading-mask');
    const loadingNum = document.getElementById('loading-num');

    // --- 状态判断核心 ---
    const isFirstVisit = !sessionStorage.getItem('etrue-visited');
    const isTransitioning = sessionStorage.getItem('is-transitioning');

    if (isFirstVisit && !isTransitioning) {
        // [场景1: 首次访问] 
        // 1. 添加 .is-intro 类，CSS 会强制 Logo 居中放大，背景米白
        document.body.classList.add('is-intro');
        
        // 2. 开始加载资源
        startRealLoading(() => {
            // 3. 资源加载完，执行开场动画
            playIntroAnimation();
        });

    } else {
        // [场景2: 刷新/跳转]
        // 1. 确保移除 .is-intro，CSS 会让 Logo 默认固定在左上角 (transition: none)
        document.body.classList.remove('is-intro');
        
        // 2. 瞬间隐藏遮罩
        if(loadingMask) loadingMask.style.display = 'none';
        
        // 3. 标记完成
        finishLoading();

        // 4. 如果是页内跳转，处理幕布
        if (isTransitioning) {
            handleTransitionEnter();
        }
    }


    // --- 核心函数定义 ---

    function startRealLoading(callback) {
        const images = Array.from(document.images);
        const videos = Array.from(document.querySelectorAll('video'));
        const allAssets = [...images, ...videos];
        let loadedCount = 0;
        const totalCount = allAssets.length;

        if (loadingNum) loadingNum.innerText = '0%';

        if (totalCount === 0) {
            if (loadingNum) loadingNum.innerText = '100%';
            setTimeout(callback, 200);
            return;
        }

        const onAssetLoaded = () => {
            loadedCount++;
            const percent = Math.round((loadedCount / totalCount) * 100);
            if (loadingNum) loadingNum.innerText = percent + '%';
            if (loadedCount >= totalCount) setTimeout(callback, 500);
        };

        allAssets.forEach(asset => {
            if (asset.tagName === 'IMG') {
                if (asset.complete) onAssetLoaded();
                else { asset.addEventListener('load', onAssetLoaded); asset.addEventListener('error', onAssetLoaded); }
            } else if (asset.tagName === 'VIDEO') {
                if (asset.readyState >= 3) onAssetLoaded();
                else { asset.addEventListener('canplaythrough', onAssetLoaded, { once: true }); asset.addEventListener('error', onAssetLoaded); }
            }
        });

        // 兜底：5秒强制结束
        setTimeout(() => { if (loadedCount < totalCount) callback(); }, 5000);
    }

    function playIntroAnimation() {
        // 标记已访问
        sessionStorage.setItem('etrue-visited', 'true');

        // 切换状态：从 静止居中(is-intro) -> 运动归位(is-animating)
        document.body.classList.remove('is-intro');
        document.body.classList.add('is-animating');

        // 这里的 CSS transition 定义了：
        // 1. 图形 Logo 立即缩小
        // 2. 整个容器延迟 0.4s 后开始移动到左上角
        // 3. 文字和导航延迟 1.2s 后浮现

        // 等待动画全部结束 (约 1.8s) 后清理状态
        setTimeout(() => {
            document.body.classList.remove('is-animating');
            finishLoading();
        }, 2000);
    }

    function handleTransitionEnter() {
        sessionStorage.removeItem('is-transitioning');
        if (curtain) {
            curtain.style.transition = 'none'; 
            curtain.style.transform = 'translateX(0)';
            curtain.classList.add('is-active');
            
            const logoBox = document.getElementById('t-logo-center');
            if(logoBox) {
                logoBox.style.transition = 'none';
                logoBox.style.opacity = '1';
                logoBox.style.transform = 'translateX(0)';
            }
            void curtain.offsetWidth;

            setTimeout(() => {
                if(logoBox) {
                    logoBox.style.transition = 'opacity 0.4s ease-in, transform 0.4s ease-in';
                    void logoBox.offsetWidth; 
                    logoBox.style.opacity = '0';
                    logoBox.style.transform = 'translateX(-60px)';
                }
                curtain.style.transition = 'transform 0.6s cubic-bezier(0.7, 0, 0.3, 1)';
                curtain.style.transform = ''; 
                curtain.classList.add('is-leaving');
                curtain.classList.remove('is-active');
                setTimeout(() => { document.documentElement.style.cursor = ''; }, 600); 
            }, 50); 
        }
    }

    function finishLoading() {
        document.body.classList.add('loaded');
        window.lenis.start();
        initScrollAnimations();
    }

    // =====================================================================
    // C. 数据渲染
    // =====================================================================
    const desktopContainer = document.getElementById('desktop-prod-grid');
    const mobileArtisticBox = document.getElementById('mobile-list-artistic-container');
    const mobileNanoBox = document.getElementById('mobile-list-nano-container');

    function generateHtml(product, isMobile) {
        const attr = isMobile ? '' : `data-category="${product.category}"`;
        return `<div class="grid-item" ${attr}><div class="grid-img"><img src="${product.img}" alt="${product.id}"></div><div class="grid-text"><span class="en">${product.id}</span><span class="cn">${product.id}</span></div></div>`;
    }

    if (desktopContainer && typeof allProducts !== 'undefined') {
        desktopContainer.innerHTML = allProducts.map(p => generateHtml(p, false)).join('');
    }

    function renderMobileSection(container, category, titleEn, titleCn) {
        if (!container || typeof allProducts === 'undefined') return;
        const filtered = allProducts.filter(p => p.category === category);
        if (filtered.length === 0) return;
        const itemsHtml = filtered.map(p => generateHtml(p, true)).join('');
        container.innerHTML = `<div class="accordion-wrapper inner-accordion"><div class="accordion-title sub-title"><span class="en">${titleEn}</span><span class="cn">${titleCn}</span><span class="arrow-down"></span></div><div class="mobile-info-content"><div class="min-h-wrapper"><div class="mobile-prod-grid">${itemsHtml}</div></div></div></div>`;
    }
    renderMobileSection(mobileArtisticBox, 'artistic', 'Artistic Cement', '艺术水泥');
    renderMobileSection(mobileNanoBox, 'nano', 'Nano-Ceramic COVER', '金刚瓷釉');

    // =====================================================================
    // D. Color Selection Page
    // =====================================================================
    const colorGridIds = ['cream', 'warm', 'green', 'blue', 'yellow', 'red', 'dark'];
    colorGridIds.forEach(color => {
        const container = document.getElementById('grid-' + color);
        if(!container || typeof allProducts === 'undefined') return;
        const filtered = allProducts.filter(p => p.color === color);
        if(filtered.length === 0) {
            container.innerHTML = '<div style="opacity:0.4; font-size:0.8rem;">Coming Soon...</div>';
            return;
        }
        container.innerHTML = filtered.map(p => `<div class="grid-item"><div class="grid-img"><img src="${p.img}" alt="${p.id}" loading="lazy"></div><div class="grid-text"><span class="en">${p.id}</span><span class="cn">${p.id}</span></div></div>`).join('');
    });

    document.querySelectorAll('.c-link').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if(targetSection) {
                const isDesktop = window.innerWidth > 768;
                const offsetVal = isDesktop ? -220 : -170;
                if(window.lenis) window.lenis.scrollTo(targetSection, { offset: offsetVal, duration: 1.2 });
            }
            document.querySelectorAll('.c-link').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // =====================================================================
    // E. 桌面面板交互
    // =====================================================================
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    function closeAllPanels() {
        document.body.classList.remove('info-open', 'products-open');
        if (window.lenis) window.lenis.start();
        if (metaThemeColor) metaThemeColor.setAttribute("content", "#ffffff");
    }
    document.querySelectorAll('.action-open-panel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetClass = btn.getAttribute('data-target');
            const isAnyPanelOpen = document.body.classList.contains('info-open') || document.body.classList.contains('products-open');
            if (isAnyPanelOpen) {
                document.body.classList.remove('info-open', 'products-open');
                document.body.classList.add(targetClass);
            } else {
                closeAllPanels(); 
                document.body.classList.add(targetClass);
            }
            if (targetClass === 'products-open') {
                const grid = document.getElementById('desktop-prod-grid');
                if (grid) grid.scrollTop = 0; 
            }
            if (window.lenis) window.lenis.stop();
            if (window.innerWidth <= 768 && targetClass === 'info-open' && metaThemeColor) {
                metaThemeColor.setAttribute("content", "#635845");
            }
        });
    });
    document.querySelectorAll('.action-close-panel').forEach(btn => { btn.addEventListener('click', closeAllPanels); });
    const pageWrapper = document.getElementById('page-wrapper');
    if (pageWrapper) {
        pageWrapper.addEventListener('click', (e) => {
            if ((document.body.classList.contains('info-open') || document.body.classList.contains('products-open')) && !e.target.closest('a')) {
                closeAllPanels();
            }
        });
    }
    document.querySelectorAll('.cat-item').forEach(cat => {
        cat.addEventListener('click', function() {
            const grid = document.getElementById('desktop-prod-grid');
            if (grid) grid.scrollTop = 0;
            document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const filterValue = this.getAttribute('data-filter');
            const items = document.querySelectorAll('#desktop-prod-grid .grid-item');
            items.forEach(item => {
                const itemCat = item.getAttribute('data-category');
                if (filterValue === 'all' || filterValue === itemCat) {
                    item.classList.remove('hidden');
                    item.style.opacity = '0';
                    item.style.transform = 'translateY(10px)';
                    setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateY(0)'; }, 50);
                } else { item.classList.add('hidden'); }
            });
        });
    });

    // =====================================================================
    // F. 移动端交互
    // =====================================================================
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileOverlay = document.getElementById('mobile-menu-overlay');
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            closeAllPanels(); 
            document.body.classList.toggle('menu-open');
            const isOpen = document.body.classList.contains('menu-open');
            if (isOpen) {
                if(metaThemeColor) metaThemeColor.setAttribute("content", "#635845");
                if(window.lenis) window.lenis.stop();
                document.documentElement.style.touchAction = "auto";
            } else {
                if(metaThemeColor) metaThemeColor.setAttribute("content", "#ffffff");
                if(window.lenis) window.lenis.start();
                setTimeout(() => {
                    if(mobileOverlay) mobileOverlay.classList.remove('show-product-view');
                    document.querySelectorAll('.accordion-wrapper.expanded').forEach(el => el.classList.remove('expanded'));
                }, 500);
            }
        });
    }
    const toProds = document.getElementById('mobile-to-products');
    if(toProds) toProds.addEventListener('click', (e) => { e.preventDefault(); if(mobileOverlay) mobileOverlay.classList.add('show-product-view'); });
    const backBtn = document.getElementById('mobile-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if(mobileOverlay) mobileOverlay.classList.remove('show-product-view');
            setTimeout(() => {
                const expandedItems = document.querySelectorAll('.view-products .accordion-wrapper.expanded');
                expandedItems.forEach(el => {
                    el.classList.remove('expanded');
                    const content = el.querySelector('.mobile-info-content');
                    const inner = el.querySelector('.min-h-wrapper');
                    if(content) content.style.overflow = "";
                    if(inner) inner.style.overflow = "";
                });
            }, 500);
        });
    }
    document.body.addEventListener('click', (e) => {
        const title = e.target.closest('.accordion-title');
        if (!title) return;
        const wrapper = title.closest('.accordion-wrapper');
        if (wrapper && document.body.classList.contains('menu-open')) {
            e.preventDefault();
            e.stopPropagation();
            const isExpanding = !wrapper.classList.contains('expanded');
            wrapper.classList.toggle('expanded');
            const content = wrapper.querySelector('.mobile-info-content');
            const inner = wrapper.querySelector('.min-h-wrapper');
            if (isExpanding) {
                if (inner) inner.scrollTop = 0;
                setTimeout(() => {
                    if (wrapper.classList.contains('expanded')) {
                        if(content) content.style.overflow = "visible";
                        if(inner) inner.style.overflow = "visible"; 
                    }
                }, 500);
            } else {
                if(content) content.style.overflow = "hidden";
                if(inner) inner.style.overflow = "hidden";
            }
        }
    });

    // =====================================================================
    // G. 辅助功能
    // =====================================================================
    function setLanguage(lang) {
        const desktopBtn = document.getElementById('lang-switch-desktop');
        if (lang === 'cn') {
            document.body.classList.add('lang-cn');
            if(desktopBtn) desktopBtn.innerText = "En";
            localStorage.setItem('site-language', 'cn');
        } else {
            document.body.classList.remove('lang-cn');
            if(desktopBtn) desktopBtn.innerText = "中";
            localStorage.setItem('site-language', 'en');
        }
    }
    if (localStorage.getItem('site-language') === 'cn') setLanguage('cn');
    else setLanguage('en'); 
    const toggleLang = (e) => {
        e.preventDefault();
        const isCn = document.body.classList.contains('lang-cn');
        setLanguage(isCn ? 'en' : 'cn');
    };
    const deskLangBtn = document.getElementById('lang-switch-desktop');
    const mobLangBtn = document.getElementById('lang-switch-mobile');
    if(deskLangBtn) deskLangBtn.addEventListener('click', toggleLang);
    if(mobLangBtn) mobLangBtn.addEventListener('click', toggleLang);

    document.querySelectorAll('.swatch').forEach(swatch => {
        swatch.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            const newImgSrc = this.getAttribute('data-img');
            const newLinkUrl = this.getAttribute('data-link');
            if (!newImgSrc) return;
            const box = this.closest('.inner-box');
            const img = box.querySelector('.main-img');
            const link = box.querySelector('.img-link');
            if (img) {
                img.style.opacity = 0.5;
                setTimeout(() => { img.src = newImgSrc; img.style.opacity = 1; }, 150);
            }
            if (link && newLinkUrl) link.href = newLinkUrl;
            box.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
            this.classList.add('active');
        });
    });

    window.addEventListener('scroll', () => {
        document.body.classList.toggle('scrolled-down', window.scrollY > 50);
    });
    function initScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
        document.querySelectorAll('.product-item, footer, .scroll-anim, .video-section, .text-full, .product-number-section, .detail-col-left, .detail-intro, .data-row')
                .forEach(item => observer.observe(item));
    }

    const cursor = document.getElementById('custom-cursor');
    if (cursor && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        let mouseX = -100, mouseY = -100, cursorX = -100, cursorY = -100;
        const cursorText = cursor.querySelector('.cursor-text');
        document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; cursor.style.opacity = '1'; });
        document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) cursor.style.opacity = '0'; });
        function animate() {
            cursorX += (mouseX - cursorX) * 0.15;
            cursorY += (mouseY - cursorY) * 0.15;
            cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
            requestAnimationFrame(animate);
        }
        animate();
        const hoverTargets = 'a, .inner-box, .video-section, button, .close-btn, #hamburger-btn, .accordion-title, .p-tab-item, .cat-item, .grid-item, .swatch, .c-link, .detail-col-left';
        document.body.addEventListener('mouseover', (e) => {
            const target = e.target.closest(hoverTargets);
            if (target) {
                const isClose = target.classList.contains('close-btn') || target.classList.contains('action-close-panel');
                cursor.classList.add(isClose ? 'mode-close' : 'mode-explore');
                if(cursorText) cursorText.innerText = isClose ? 'Close' : 'Explore';
            }
        });
        document.body.addEventListener('mouseout', (e) => {
             if (e.target.closest(hoverTargets)) {
                cursor.classList.remove('mode-explore', 'mode-close');
                if(cursorText) cursorText.innerText = '';
             }
        });
    }
});