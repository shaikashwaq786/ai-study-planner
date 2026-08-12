with open('app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make main animated
content = content.replace(
    '<main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">',
    '<motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, staggerChildren: 0.1 }} className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">'
)
content = content.replace(
    '</main>',
    '</motion.main>'
)

# Animate header
content = content.replace(
    '<header className="sticky top-0 z-30 border-b border-white/10 bg-[#090d16]/80 backdrop-blur-md px-6 py-4">',
    '<motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="sticky top-0 z-30 border-b border-white/10 bg-[#090d16]/80 backdrop-blur-md px-6 py-4">'
)
content = content.replace(
    '</header>',
    '</motion.header>'
)

# Make all buttons use framer motion
content = content.replace('<button', '<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}')
content = content.replace('</button>', '</motion.button>')

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
