# -*- coding: utf-8 -*-
with open('src/i18n.ts', 'rb') as f:
    lines = f.readlines()

assert b'"face.aa"' in lines[948]
assert b'"toast.switching_model"' in lines[954]

ko_missing_str = [
    '    "face.ih": "입모양 I:",\n',
    '    "face.ou": "입모양 U:",\n',
    '    "face.ee": "입모양 E:",\n',
    '    "face.oh": "입모양 O:",\n',
    '    "face.blink": "눈 깜빡임:",\n',
    '    "hand.title": "손",\n',
    '    "hand.curl": "손가락 구부림 (전체):",\n',
    '    "hand.left_title": "손가락 (왼쪽):",\n',
    '    "hand.right_title": "손가락 (오른쪽):",\n',
    '    "hand.thumb": "엄지:",\n',
    '    "hand.index": "검지:",\n',
    '    "hand.middle": "중지:",\n',
    '    "hand.ring": "약지:",\n',
    '    "hand.little": "새끼:",\n',
    '    "settings.voice": "음성 (Voice):",\n',
    '    "lang.vi": "베트남어",\n',
    '    "lang.en": "영어",\n',
    '    "lang.ja": "일본어",\n',
    '    "lang.zh": "중국어",\n',
    '    "lang.ko": "한국어",\n',
    '    "btn.save_settings": "설정 저장",\n',
    '    "btn.reset_settings": "기본값 복원",\n',
    '    "profile.title": "개인 프로필",\n',
    '    "profile.display_name": "표시 이름",\n',
    '    "profile.nickname": "닉네임 (AI가 이렇게 부릅니다)",\n',
    '    "profile.email": "이메일:",\n',
    '    "profile.join_date": "가입일:",\n',
    '    "profile.upload_hint": "가장 멋진 사진을 업로드하세요.\\n정사각형, 2MB 이하 권장.",\n',
    '    "profile.save": "변경 사항 저장",\n',
    '    "profile.logout": "로그아웃",\n',
    '    "auth.title": "🌸 시틀랄리와 연결 🌸",\n',
    '    "auth.subtitle": "시틀랄리가 우리의 이야기를 기억할 수 있도록 로그인해 주세요!",\n',
    '    "auth.email": "이메일",\n',
    '    "auth.password": "비밀번호",\n',
    '    "auth.no_account": "계정이 없으신가요?",\n',
    '    "auth.register_now": "지금 가입하기",\n',
    '    "auth.has_account": "이미 계정이 있으신가요?",\n',
    '    "auth.confirm_password": "비밀번호 확인",\n',
    '    "auth.register": "가입",\n',
    '    "auth.or": "또는",\n',
    '    "auth.google": "Google로 로그인",\n',
    '    "auth.guest": "게스트 모드 (데이터 저장 안 됨)",\n',
    '    "auth.logging_in": "로그인 중...",\n',
    '    "auth.redirecting": "페이지 이동 중...",\n',
    '    "profile.display_name_placeholder": "당신의 이름...",\n',
    '    "profile.nickname_placeholder": "별명...",\n',
    '    "toast.saved_settings": "설정이 저장되었습니다!",\n',
    '    "alert.login_required": "새 채팅을 만들려면 로그인하세요!",\n',
    '    "alert.fill_info": "모든 정보를 입력하세요",\n',
    '    "alert.login_failed": "로그인 실패: ",\n',
    '    "alert.pass_mismatch": "비밀번호가 일치하지 않습니다!",\n',
    '    "alert.reg_failed": "가입 실패: ",\n',
    '    "alert.reg_success": "가입 성공!",\n',
]

ko_missing_bytes = [s.encode('utf-8') for s in ko_missing_str]

new_lines = lines[:949] + ko_missing_bytes + lines[954:]

with open('src/i18n.ts', 'wb') as f:
    f.writelines(new_lines)

print("Successfully fixed src/i18n.ts!")
