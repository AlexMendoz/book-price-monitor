gsap.registerPlugin(DrawSVGPlugin);

var particleLayer = document.querySelector('.particles');
var particleColors = ['#c9143b', '#ff4f68', '#ffc857', '#fff0e8'];

for (var particleIndex = 0; particleIndex < 46; particleIndex += 1) {
    var particle = document.createElement('span');
    var particleSize = 2 + Math.random() * 4;

    particle.className = 'particle';
    particle.style.setProperty('--left', (3 + Math.random() * 94) + '%');
    particle.style.setProperty('--top', (12 + Math.random() * 86) + '%');
    particle.style.setProperty('--size', particleSize + 'px');
    particle.style.setProperty('--duration', (6 + Math.random() * 8) + 's');
    particle.style.setProperty('--delay', (-Math.random() * 14) + 's');
    particle.style.setProperty('--drift', (-35 + Math.random() * 70) + 'px');
    particle.style.setProperty('--opacity', (0.35 + Math.random() * 0.55).toFixed(2));
    particle.style.setProperty('--color', particleColors[particleIndex % particleColors.length]);
    particleLayer.appendChild(particle);
}

var strokesLeftBottom = Array.from(document.querySelectorAll('#LeftBottomGroup_1_ path[id^=Stroke]')).reverse();
var strokesLeftTop = Array.from(document.querySelectorAll('#LeftTopGroup_1_ path[id^=Stroke]')).reverse();
var strokesRightBottom = Array.from(document.querySelectorAll('#RightBottomGroup_1_ path[id^=Stroke]')).reverse();
var strokesRightTop = Array.from(document.querySelectorAll('#RightTopGroup_1_ path[id^=Stroke]')).reverse();

var stemGroup1 = ['#Stem2_1_', '#Stem3_1_', '#Stem4_1_', '#Stem5a_1_', '#Stem5b_1_', '#Stem6_1_', '#Stem7a_1_', '#Stem7b_1_', '#Stem7c_1_', '#Stem8_1_'];
var stemGroup2 = ['#Stem17_1_', '#Stem18_1_', '#Stem19_1_', '#Stem20a_1_', '#Stem20b_1_', '#Stem21_1_', '#Stem22a_1_', '#Stem22b_1_', '#Stem22c_1_', '#Stem23_1_'];
var stemGroup3 = ['#Stem10_1_', '#Stem11_1_', '#Stem12a_1_', '#Stem12b_1_'];
var stemGroup4 = ['#Stem26_1_', '#Stem27_1_', '#Stem28a_1_', '#Stem28b_1_'];
var stemGroup5 = ['#Stem13a_1_', '#Stem13b_1_', '#Stem13c_1_'];
var stemGroup6 = ['#Stem29a_1_', '#Stem29b_1_', '#Stem29c_1_'];
var stemVarsFrom = { drawSVG: "0% 0%", autoAlpha: 1 };
var stemVarsTo = { drawSVG: "0% 100%", duration: 2, stagger: 0.5 };

var leafGroup1 = ['#Leaf2_1_', '#Leaf17_1_'];
var leafGroup2 = ['#Leaf4_1_', '#Leaf5a_1_', '#Leaf5b_1_'];
var leafGroup3 = ['#Leaf19_1_', '#Leaf20a_1_', '#Leaf20b_1_'];
var leafGroup4 = ['#Leaf11_1_', '#Leaf12a_1_', '#Leaf12b_1_'];
var leafGroup5 = ['#Leaf27_1_', '#Leaf28a_1_', '#Leaf28b_1_'];
var leafGroup6 = ['#Leaf13a_1_', '#Leaf13b_1_', '#Leaf13c_1_'];
var leafGroup7 = ['#Leaf29a_1_', '#Leaf29b_1_', '#Leaf29c_1_'];

var budGroup1 = ['#Bud3_1_', '#Bud6_1_'];
var budGroup2 = ['#Bud18_1_', '#Bud21_1_'];
var budGroup3 = ['#Bud7a_1_', '#Bud7b_1_', '#Bud7c_1_', '#Bud8_1_'];
var budGroup4 = ['#Bud22a_1_', '#Bud22b_1_', '#Bud22c_1_', '#Bud23_1_'];
var budGroup5 = ['#Bud10_1_', '#Bud26_1_'];

var dots = document.querySelector('#Dots_1_');

var tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
    .addLabel('start', 0)
    .addLabel('flower1', 1.75)
    .addLabel('flower2', 4.5)
    .addLabel('flower3', 7)
    .set('#Footer_group_1_', { autoAlpha: 1 })
    .to(particleLayer, { duration: 7, clipPath: 'inset(0% 0 0 0)', ease: 'power1.inOut' }, 'start')
    .fromTo(['#Stem16_1_', '#Stem1_1_'], { drawSVG: "0% 0%" }, { duration: 1.5, drawSVG: "0% 100%" }, 'start')
    .fromTo('#BaseGroup16_1_ path', { autoAlpha: 1, scale: 0, transformOrigin: '-10% 130%' }, { duration: 1, scale: 1 }, 1.2, 'flower1')
    .fromTo('#PinkFlowerGroup16_1_', { autoAlpha: 1, scale: 0, transformOrigin: '35% 110%' }, { duration: 2, scale: 1 }, 'flower1-=0.55')
    .fromTo('#BaseGroup1_1_ path', { autoAlpha: 1, scale: 0, transformOrigin: '90% 130%' }, { duration: 1, scale: 1 }, 1.2, 'flower1')
    .fromTo('#PinkFlowerGroup1_1_', { autoAlpha: 1, scale: 0, transformOrigin: '65% 110%' }, { duration: 2, scale: 1 }, 'flower1-=0.55')
    .fromTo(['#Stem9_1_', '#Stem25_1_'], { drawSVG: "0% 0%", autoAlpha: 1 }, { duration: 2, drawSVG: "0% 100%" }, 'flower1+=0.5')
    .fromTo('#BaseGroup9_1_ path', { autoAlpha: 1, scale: 0, transformOrigin: '-10% 130%' }, { duration: 1, scale: 1 }, 'flower2-=0.5')
    .fromTo('#PinkFlowerGroup9_1_', { autoAlpha: 1, scale: 0, transformOrigin: '5% 110%' }, { duration: 2, scale: 1 }, 'flower2')
    .fromTo('#BaseGroup25_1_ path', { autoAlpha: 1, scale: 0, transformOrigin: '105% 130%' }, { duration: 1, scale: 1 }, 'flower2-=0.5')
    .fromTo('#PinkFlowerGroup25_1_', { autoAlpha: 1, scale: 0, transformOrigin: '95% 110%' }, { duration: 2, scale: 1 }, 'flower2')

    //stems
    .fromTo(stemGroup1, stemVarsFrom, stemVarsTo, 'start+=0.1')
    .fromTo(stemGroup2, stemVarsFrom, stemVarsTo, 'start+=0.1')
    .fromTo(stemGroup3, stemVarsFrom, stemVarsTo, 'flower2-=1.5')
    .fromTo(stemGroup4, stemVarsFrom, stemVarsTo, 'flower2-=1.5')
    .fromTo(stemGroup5, stemVarsFrom, stemVarsTo, 'flower3-=1')
    .fromTo(stemGroup6, stemVarsFrom, stemVarsTo, 'flower3-=1')

    //leaves
    .fromTo(leafGroup1, { autoAlpha: 1, scale: 0, transformOrigin: gsap.utils.wrap(["80% 45%", "20% 45%"]) }, { duration: 2, scale: 1 }, 'flower1-=1')
    .fromTo(leafGroup2, { autoAlpha: 1, scale: 0, transformOrigin: gsap.utils.wrap(["80% 25%", "60% 35%", "70% 75%"]) }, { duration: 2, stagger: 0.5, scale: 1 }, 'flower1')
    .fromTo(leafGroup3, { autoAlpha: 1, scale: 0, transformOrigin: gsap.utils.wrap(["20% 25%", "40% 35%", "30% 75%"]) }, { duration: 2, stagger: 0.5, scale: 1 }, 'flower1')
    .fromTo(leafGroup4, { autoAlpha: 1, scale: 0, transformOrigin: gsap.utils.wrap(["90% 70%", "100% 100%", "0% 90%"]) }, { duration: 2, stagger: 0.5, scale: 1 }, 'flower2')
    .fromTo(leafGroup5, { autoAlpha: 1, scale: 0, transformOrigin: gsap.utils.wrap(["10% 70%", "0% 100%", "100% 90%"]) }, { duration: 2, stagger: 0.5, scale: 1 }, 'flower2')
    .fromTo(leafGroup6, { autoAlpha: 1, scale: 0, transformOrigin: gsap.utils.wrap(["0% 90%", "10% 50%", "70% 60%"]) }, { duration: 2, stagger: 0.5, scale: 1 }, 'flower3')
    .fromTo(leafGroup7, { autoAlpha: 1, scale: 0, transformOrigin: gsap.utils.wrap(["100% 90%", "90% 50%", "30% 60%"]) }, { duration: 2, stagger: 0.5, scale: 1 }, 'flower3')

    //buds
    .fromTo(budGroup1, { autoAlpha: 1, scale: 0, transformOrigin: gsap.utils.wrap(['220% -10%', '55% 100%']) }, { duration: 2, scale: 1, stagger: 2.75 }, 'flower1-=0.75')
    .fromTo(budGroup2, { autoAlpha: 1, scale: 0, transformOrigin: gsap.utils.wrap(['-120% -10%', '45% 100%']) }, { duration: 2, scale: 1, stagger: 2.75 }, 'flower1-=0.75')
    .fromTo(budGroup3, { autoAlpha: 1, scale: 0, transformOrigin: gsap.utils.wrap(['10% 110%', '0% 100%', '0% 100%', '80% 100%']) }, { duration: 2, scale: 1, stagger: 0.5 }, 'flower2')
    .fromTo(budGroup4, { autoAlpha: 1, scale: 0, transformOrigin: gsap.utils.wrap(['90% 110%', '100% 100%', '100% 100%', '20% 100%']) }, { duration: 2, scale: 1, stagger: 0.5 }, 'flower2')
    .fromTo(budGroup5, { autoAlpha: 1, scale: 0, transformOrigin: gsap.utils.wrap(['-50% 120%', '150% 120%']) }, { duration: 2, scale: 1 }, 'flower2-=0.5')

    //strokes
    .fromTo(strokesLeftBottom, stemVarsFrom, { drawSVG: "0% 100%", duration: 2, stagger: 1 }, 1)
    .fromTo(strokesRightBottom, stemVarsFrom, { drawSVG: "0% 100%", duration: 2, stagger: 1 }, 1)
    .fromTo(strokesLeftTop, stemVarsFrom, { drawSVG: "0% 100%", duration: 2, stagger: 1 }, 'flower1+=0.5')
    .fromTo(strokesRightTop, stemVarsFrom, { drawSVG: "0% 100%", duration: 2, stagger: 1 }, 'flower1+=0.5')

    //dots
    .fromTo(dots, 6, { autoAlpha: 0 }, { autoAlpha: 1, ease: Expo.easeOut }, 'flower3+=1')
    .fromTo(dots, 5, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, ease: Expo.easeOut }, 'flower3')
    .fromTo('.dedication', { autoAlpha: 0 }, { duration: 2, autoAlpha: 1, ease: 'power2.out' }, 'flower3+=1.5')
    .fromTo('.signature', { autoAlpha: 0 }, { duration: 1.5, autoAlpha: 1, ease: 'power2.out' }, 'flower3+=2.2');

tl.timeScale(1.25);

if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.location.hash === '#final') {
    tl.progress(1);
}
