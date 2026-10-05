# 기도그룹 개발 규칙

- **배포 시 반드시 버전 증가**: 자잘한 버그 수정이라도 프론트 푸시(자동배포) 전 `next-app/package.json`과 `next-app/src/components/Sidebar.js`의 버전을 +1 한다. push → Vercel 자동배포.
- **GAS(code.gs) 수정 시**: 운영 시트 Apps Script에 붙여넣고 `배포 관리 > 새 버전`으로 재배포 (URL 유지, `새 배포` 금지).
- 운영 시트: https://docs.google.com/spreadsheets/d/1AvizRUbFhxxwUbsRRqlQfd0-guVpU1BeVP6kYNdLhbY/edit?gid=394986677#gid=394986677
