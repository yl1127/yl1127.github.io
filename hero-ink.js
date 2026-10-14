// Inspired by the public shaders.com hero: InkFlow under a fine Stone filter.
const host = document.querySelector('.hero-ink');
const canvas = host.querySelector('canvas');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const mouse = matchMedia('(hover: hover) and (pointer: fine)');
const compact = matchMedia('(max-width: 600px)');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let shader, pending = false, visible = true;
const isDark = () => (document.documentElement.dataset.theme || (systemTheme.matches ? 'dark' : 'light')) === 'dark';
const inkColors = () => isDark()
    ? { color1: '#3f6486', color2: '#779bad', color3: '#526981' }
    : { color1: '#718da6', color2: '#9ab5c5', color3: '#8198af' };
function syncTheme() {
    shader?.update('ink-base', { color: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() });
    shader?.update('ink-trail', inkColors());
    shader?.update('ink-texture', { opacity: isDark() ? 0.58 : 0.25 });
}
function syncPlayback() {
    host.dataset.paused = String(document.hidden || !visible || motion.matches);
    if (!shader) return;
    if (document.hidden || !visible || motion.matches || !mouse.matches || compact.matches) shader.pause();
    else shader.resume();
}
async function initialize() {
    if (shader || pending || motion.matches || !mouse.matches || compact.matches || !navigator.gpu) return;
    pending = true;
    try {
        const { createShader } = await import('./assets/vendor/shaders-4.0.4.js');
        shader = await createShader(canvas, { components: [
            { id: 'ink-base', type: 'SolidColor', props: { color: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() } },
            { id: 'ink-texture', type: 'Stone', props: { intensity: 1, scale: 200, opacity: isDark() ? 0.58 : 0.25 }, children: [
                { id: 'ink-trail', type: 'InkFlow', props: {
                    colorMode: 'custom', ...inkColors(), colorSpeed: 0.35,
                    radius: 0.42, force: 0.65, curl: 0, decay: 0.65, momentum: 0.6,
                } },
            ] },
        ] }, {
            disableTelemetry: true,
            onReady: () => { host.dataset.state = 'ready'; },
            onError: () => { host.dataset.state = 'fallback'; },
        });
        if (shader.getFailureReason()) host.dataset.state = 'fallback';
        syncTheme();
        syncPlayback();
    } catch (error) {
        host.dataset.state = 'fallback';
        console.warn('Ink background unavailable; using soft ambient light.', error);
    } finally { pending = false; }
}
new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
systemTheme.addEventListener('change', syncTheme);
for (const media of [motion, mouse, compact]) media.addEventListener('change', () => { initialize(); syncPlayback(); });
document.addEventListener('visibilitychange', syncPlayback);
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncPlayback(); }).observe(host);
window.addEventListener('pagehide', () => shader?.pause());
window.addEventListener('pageshow', syncPlayback);
initialize();
