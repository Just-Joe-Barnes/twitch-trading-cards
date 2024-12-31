module.exports = {
    content: ["./src/**/*.{html,js}"],
    theme: {
        extend: {
            colors: {
                "common-border": "#777",
                "uncommon-border": "#4CAF50",
                "rare-border": "#2196F3",
                "legendary-border": "#FF9800",
                "mythic-border": "#FF1493",
            },
        },
    },
    plugins: [require("@tailwindcss/typography")],
};
