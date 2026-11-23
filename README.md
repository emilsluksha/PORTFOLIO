# AURA ONE — Interactive 3D Laptop Experience

An interactive 3D luxury hardware showcase and virtual product showroom for the fictional **AURA ONE** ultrabook.

**Live Preview:** https://emilsluksha.github.io/PORTFOLIO/

## Highlights

- **Real-Time Interactive 3D Model**: Procedural CNC-machined anodized aluminum ultrabook rendered with Three.js & React Three Fiber—featuring 78 instanced backlit keys, micro-perforated acoustic grilles, haptic glass trackpad, Thunderbolt/Mag-power/SDXC ports, articulated clutch hinge, mirror AURA emblem, and a custom GLSL OLED wallpaper shader.
- **Four Coordinated Finishes**: Crimson Red, Electric Blue, Emerald Green, and Solar Yellow—with synchronized studio lighting, OLED wallpaper morphing, and matte studio backdrop transitions.
- **Signature 3D Color-Switching Animation**: Smooth GSAP-driven 360° rotating transformation resilient to rapid repeated selections.
- **Cinematic Scroll Storytelling & Virtual Showroom**: Persistent WebGL canvas across `Home`, `Explore`, `Order`, camera angle presets (`Front / Back / Side / Top`), articulated lid open/close control, mouse/touch rotation, zoom, and conceptual checkout demo.

## Tech Stack

- React 19 + TypeScript + Vite
- Three.js + `@react-three/fiber` + `@react-three/drei`
- GSAP + ScrollTrigger
- Framer Motion
- Tailwind CSS v4 + Lucide Icons

## Local Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

---

*AURA ONE is a fictional concept design demonstration. No real hardware is sold.*
