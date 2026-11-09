"""Pone el ícono del inicio en tres activity-alias (original, Navidad y Velitas)."""
import re
import sys

p = sys.argv[1]
s = open(p).read()
if '.InicioNavidad' not in s:
    launcher = re.search(r'\s*<category android:name="android.intent.category.LAUNCHER"\s*/>', s)
    s = s[:launcher.start()] + s[launcher.end():]
    icon = re.search(r'<application[^>]*?android:icon="([^"]+)"', s, re.S)
    icon = icon.group(1) if icon else '@mipmap/ic_launcher'

    def alias(name, ic, on):
        return ('\n        <activity-alias android:name=".%s" android:enabled="%s" android:exported="true"\n'
                '            android:icon="%s" android:roundIcon="%s" android:targetActivity=".MainActivity">\n'
                '            <intent-filter>\n'
                '                <action android:name="android.intent.action.MAIN" />\n'
                '                <category android:name="android.intent.category.LAUNCHER" />\n'
                '            </intent-filter>\n'
                '        </activity-alias>') % (name, on, ic, ic)

    block = alias('Inicio', icon, 'true') + alias('InicioNavidad', '@mipmap/ic_launcher_navidad', 'false') \
        + alias('InicioVelitas', '@mipmap/ic_launcher_velitas', 'false')
    i = s.index('</activity>', s.index('MainActivity')) + len('</activity>')
    s = s[:i] + block + s[i:]
    open(p, 'w').write(s)
    print('Íconos de temporada: aliases agregados')
