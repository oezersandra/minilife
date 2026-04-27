const fs = require('fs');
const image = fs.readFileSync('baby_spritesheet_v3.png');
const base64 = image.toString('base64');
const css = `
#baby-layer {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 250px;
    height: 250px;
    pointer-events: none;
    z-index: 500; /* Extremely high to be on top */
    background-image: url('data:image/png;base64,${base64}');
    background-size: 500% 400%;
    background-repeat: no-repeat;
    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3));
    transition: background-position 0.1s steps(1);
    display: block !important;
    visibility: visible !important;
}
`;
fs.appendFileSync('index.css', css);
console.log('Base64 Baby added to CSS');
