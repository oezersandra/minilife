const fs = require('fs');
let css = fs.readFileSync('index.css', 'utf8');

// Strip old baby styles
css = css.split('#baby-container {')[0];

const base64 = fs.readFileSync('baby_base64.txt', 'utf8').trim();

const newStyles = `
#baby-container {
    width: 100%;
    height: 220px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0.5rem 0;
    position: relative;
    z-index: 10;
}

.baby-layer {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200px;
    height: 200px;
    background-image: url('data:image/png;base64,${base64}');
    background-size: 500% 400%;
    background-repeat: no-repeat;
    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3));
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
    pointer-events: none;
}

.baby-layer.active {
    opacity: 1;
}

/* Idle breathing animation applied to the container to affect both layers */
#baby-container {
    animation: breathe 4s ease-in-out infinite;
}

@keyframes breathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.04); }
}

.stats-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 2rem;
}
`;

fs.writeFileSync('index.css', css + newStyles);
console.log('CSS Rebuilt with Cross-Fade support');
