/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                display: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
                serif: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
                mono: ["IBM Plex Mono", "monospace"],
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
                card: '16px',
                control: '10px',
            },
            boxShadow: {
                card: '0 1px 2px rgba(15,15,15,0.03), 0 8px 24px -12px rgba(15,15,15,0.10)',
                lift: '0 2px 4px rgba(15,15,15,0.04), 0 16px 32px -16px rgba(15,15,15,0.16)',
            },
            opacity: {
                3: '0.03',
                6: '0.06',
                8: '0.08',
                12: '0.12',
                14: '0.14',
                18: '0.18',
                22: '0.22',
                35: '0.35',
                45: '0.45',
                55: '0.55',
                65: '0.65',
                85: '0.85',
            },
            colors: {
                alabaster: "#F9F8F6",
                obsidian: "#0F0F0F",
                terracotta: "#B64626",
                olive: "#3A4533",
                linen: "#EAE7E0",
                surface: "#FFFFFF",
                "surface-muted": "#FBFAF8",
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
                popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
                primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
                secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
                muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
                accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
                destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))'
                }
            },
            keyframes: {
                'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
                'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
                'fade-up': {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-up': 'fade-up 0.5s ease-out both'
            }
        }
    },
    plugins: [require("tailwindcss-animate")],
};
