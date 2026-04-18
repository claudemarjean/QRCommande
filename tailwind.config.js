/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,css}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f4ede1',
        ink: '#1d1d1b',
        gold: '#c49b51',
        wine: '#7a2939',
        pine: '#18352f'
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        body: ['Manrope', 'sans-serif']
      },
      boxShadow: {
        soft: '0 25px 60px rgba(29, 29, 27, 0.14)'
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(circle at top, rgba(196, 155, 81, 0.35), transparent 40%), radial-gradient(circle at bottom right, rgba(122, 41, 57, 0.2), transparent 30%)'
      }
    }
  },
  plugins: []
};