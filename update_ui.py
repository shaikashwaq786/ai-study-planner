with open('app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Auth screen
target1 = '<div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">'
replace1 = '<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="glass-panel w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] space-y-6">'
content = content.replace(target1, replace1)

# Fix auth screen closing tag
target2 = '</form>\n          </div>\n        </div>\n      </div>'
replace2 = '</form>\n          </div>\n        </motion.div>\n      </div>'
content = content.replace(target2, replace2)

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
