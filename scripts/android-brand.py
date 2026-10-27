#!/usr/bin/env python3
"""Android branding for the Kinora build (run after `npx cap add android` and `capacitor-assets generate`).
 - animated K splash (Android 12+ plays it, older versions show it still) on the app's own dark colour
 - dark window background so there is no white flash while the page loads
 - vibration permission (touch feedback) and a themed/monochrome launcher icon layer
"""
import os
import re

RES = 'android/app/src/main/res'
MANIFEST = 'android/app/src/main/AndroidManifest.xml'

PATHS = [
    'M520 272Q538 268 538 292V948Q538 968 516 958L362 862Q340 846 340 820V432Q340 396 366 376Z',
    'M548 642L738 406Q752 392 782 392H914Q936 394 924 412L692 660Q672 686 640 676Q586 662 548 642Z',
    'M548 690Q650 688 722 726Q790 764 872 884L932 944Q942 958 920 962H772Q724 956 694 912L588 762Q556 726 548 690Z',
]
# the splash icon canvas is 288dp with a 192dp circle visible; keep the mark well inside it
S = 116 / 700.0
CX, CY = 639.0, 618.0


def fmt(v):
    return ('%.2f' % v).rstrip('0').rstrip('.')


def transform(d):
    toks = re.findall(r'[MLQVHZ]|-?\d+\.?\d*', d)
    out, cmd, buf = [], None, []
    for t in toks:
        if t.isalpha():
            if cmd == 'Z':
                out.append('Z')
            cmd, buf = t, []
            if t == 'Z':
                out.append('Z')
            else:
                out.append(t)
            continue
        buf.append(float(t))
        if cmd in 'MLQ' and len(buf) % 2 == 0:
            x, y = buf[-2], buf[-1]
            out.append('%s,%s' % (fmt((x - CX) * S + 144), fmt((y - CY) * S + 144)))
        elif cmd == 'H':
            out.append(fmt((buf[-1] - CX) * S + 144))
        elif cmd == 'V':
            out.append(fmt((buf[-1] - CY) * S + 144))
    return ' '.join(out).replace('Z Z', 'Z')


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


NS = 'xmlns:android="http://schemas.android.com/apk/res/android"'

# ---- animated splash icon ----
groups = ''
targets = ''
for i, d in enumerate(PATHS, start=1):
    groups += (
        '  <group android:name="g%d" android:pivotX="144" android:pivotY="144">\n'
        '    <path android:name="p%d" android:fillColor="#F3F1EA" android:pathData="%s"/>\n'
        '  </group>\n' % (i, i, transform(d))
    )
    targets += (
        '  <target android:name="g%d" android:animation="@animator/kinora_move_%d"/>\n'
        '  <target android:name="p%d" android:animation="@animator/kinora_fade_%d"/>\n' % (i, i, i, i)
    )
write(RES + '/drawable/kinora_splash_vec.xml',
      '<?xml version="1.0" encoding="utf-8"?>\n<vector %s android:width="288dp" android:height="288dp" '
      'android:viewportWidth="288" android:viewportHeight="288">\n%s</vector>\n' % (NS, groups))
write(RES + '/drawable/kinora_splash.xml',
      '<?xml version="1.0" encoding="utf-8"?>\n<animated-vector %s android:drawable="@drawable/kinora_splash_vec">\n%s</animated-vector>\n' % (NS, targets))
moves = [('translateX', -26, 0), ('translateY', -24, 80), ('translateY', 26, 160)]
for i, (prop, frm, off) in enumerate(moves, start=1):
    write(RES + '/animator/kinora_move_%d.xml' % i,
          '<?xml version="1.0" encoding="utf-8"?>\n<objectAnimator %s android:propertyName="%s" android:valueFrom="%d" android:valueTo="0" '
          'android:startOffset="%d" android:duration="520" android:valueType="floatType" '
          'android:interpolator="@android:interpolator/fast_out_slow_in"/>\n' % (NS, prop, frm, off))
    write(RES + '/animator/kinora_fade_%d.xml' % i,
          '<?xml version="1.0" encoding="utf-8"?>\n<objectAnimator %s android:propertyName="fillAlpha" android:valueFrom="0" android:valueTo="1" '
          'android:startOffset="%d" android:duration="360" android:valueType="floatType" '
          'android:interpolator="@android:interpolator/linear_out_slow_in"/>\n' % (NS, off))

write(RES + '/values/kinora_colors.xml',
      '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <color name="kinora_bg">#07080B</color>\n</resources>\n')

# ---- themes ----
sp = RES + '/values/styles.xml'
s = open(sp, encoding='utf-8').read()
launch = (
    '<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">\n'
    '        <item name="windowSplashScreenBackground">@color/kinora_bg</item>\n'
    '        <item name="windowSplashScreenAnimatedIcon">@drawable/kinora_splash</item>\n'
    '        <item name="windowSplashScreenAnimationDuration">900</item>\n'
    '        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>\n'
    '    </style>')
s, n = re.subn(r'<style name="AppTheme\.NoActionBarLaunch"[^>]*>.*?</style>', launch, s, flags=re.S)
if n == 0:  # older template: add the style
    s = s.replace('</resources>', '    ' + launch + '\n</resources>')
if 'android:windowBackground' not in s:
    s = re.sub(r'(<style name="AppTheme\.NoActionBar"[^>]*>)', r'\1\n        <item name="android:windowBackground">@color/kinora_bg</item>', s, count=1)
open(sp, 'w', encoding='utf-8').write(s)

# ---- manifest: vibration for touch feedback ----
m = open(MANIFEST, encoding='utf-8').read()
if 'android.permission.VIBRATE' not in m:
    m = m.replace('<application', '<uses-permission android:name="android.permission.VIBRATE" />\n    <application', 1)
    open(MANIFEST, 'w', encoding='utf-8').write(m)

# ---- themed (monochrome) launcher icon for Android 13+ ----
for name in ('ic_launcher.xml', 'ic_launcher_round.xml'):
    p = RES + '/mipmap-anydpi-v26/' + name
    if os.path.exists(p):
        t = open(p, encoding='utf-8').read()
        if '<monochrome' not in t:
            t = t.replace('</adaptive-icon>', '    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>')
            open(p, 'w', encoding='utf-8').write(t)
print('android branding applied')
