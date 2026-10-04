# Builds the Render index.html from tools/sourcebook.html (the master source of the book).
# Usage: python3 tools/build_render.py   (writes index.html at the repo top level)
import os
HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(HERE,os.pardir,"index.html")
src=open(os.path.join(HERE,"sourcebook.html")).read()
head='''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#EEEDEA">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Sourcebook">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="icon" href="/icon-192.png">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.5 system-ui,-apple-system,sans-serif;background:#fafaf9}img{max-width:100%}[hidden]{display:none!important}</style>
<script src="/claude-shim.js"></script>
<script src="/library.js"></script>
</head>
<body>
'''
s=src
R=[("Claude isn't allowed on this page for your account, so attachments can't be read.","Claude isn't set up on this server yet. Add an Anthropic API key (ANTHROPIC_API_KEY) in Render."),
("Claude isn't allowed on this page for your account, so materials can't be detected.","Claude isn't set up on this server yet. Add an Anthropic API key (ANTHROPIC_API_KEY) in Render."),
("Preview with example pieces. Open this page from claude.ai to see and edit the live project.","Showing example pieces because the server couldn't be reached. Check your connection and reload."),
("Uses your Claude usage. You'll be asked to allow it the first time.","Uses the Anthropic API key set on the server."),
("Claude isn't available to this page right now. Reload the book, and allow it to use Claude when asked.","Claude isn't available right now. Reload the page and try again."),
("This view can't send images to Claude. Open the book in a web browser on claude.ai to read attachments.","Images couldn't be sent to Claude. Reload the page and try again.")]
for a,b in R:
    assert a in s,a; s=s.replace(a,b)
s=s.replace('"Paste rows":"粘贴行",','"Paste rows":"粘贴行","Claude isn\'t set up on this server yet. Add an Anthropic API key (ANTHROPIC_API_KEY) in Render.":"此服务器尚未设置 Claude。请在 Render 中添加 Anthropic API 密钥（ANTHROPIC_API_KEY）。","Showing example pieces because the server couldn\'t be reached. Check your connection and reload.":"无法连接服务器，正在显示示例项目。请检查网络后重新加载。","Uses the Anthropic API key set on the server.":"使用服务器上设置的 Anthropic API 密钥。","Claude isn\'t available right now. Reload the page and try again.":"Claude 暂时不可用，请重新加载页面后重试。","Images couldn\'t be sent to Claude. Reload the page and try again.":"无法将图片发送给 Claude，请重新加载页面后重试。",',1)
s=s.replace("function render(){","function render(){try{document.title=(project.name&&project.name!==\"Untitled project\"?project.name+\" · \":\"\")+\"Sourcebook\"}catch(_){}",1)
open(OUT,'w').write(head+s+"\n</body>\n</html>\n")
print("built")

import subprocess,os
subprocess.run(["python3",os.path.join(HERE,"fontfix.py"),OUT])
