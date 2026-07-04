import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";

export const metadata: Metadata = {
  title: "개인정보 처리방침 — 온교회",
  description: "온교회(everychurch.co.kr)의 개인정보 처리방침입니다.",
  alternates: { canonical: "https://everychurch.co.kr/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="landing">
      <LandingNav />

      <main className="legal-main">
        <div className="legal-doc">
          <div className="auth-eyebrow">PRIVACY POLICY</div>
          <h1 className="legal-title">개인정보 처리방침</h1>
          <p className="legal-updated">시행일: 2026년 7월 4일</p>

          <section className="legal-section">
            <p>
              온교회(이하 “회사”)는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하고 이와 관련한 고충을
              신속하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.
            </p>
          </section>

          <section className="legal-section">
            <h2>제1조 (수집하는 개인정보 항목 및 수집방법)</h2>
            <ol>
              <li>회사는 회원가입 및 서비스 제공을 위해 다음의 개인정보를 수집합니다.
                <ul>
                  <li>필수 항목: 이름, 아이디, 비밀번호, 휴대전화번호</li>
                  <li>수집 항목: 유입경로, 마케팅 정보 수신 동의 여부</li>
                  <li>교회 홈페이지 운영 과정에서 이용자가 직접 입력하는 정보: 교회명, 연락처, 주소, 담임목사 정보, 성도 명단, 출석 정보 등</li>
                  <li>서비스 이용 과정에서 자동 생성·수집되는 정보: 접속 로그, 쿠키, 기기·브라우저 정보</li>
                </ul>
              </li>
              <li>개인정보는 회원가입, 휴대전화 본인확인, 서비스 이용 과정에서 이용자가 직접 입력하거나 자동으로 생성되어 수집됩니다.</li>
            </ol>
          </section>

          <section className="legal-section">
            <h2>제2조 (개인정보의 수집·이용 목적)</h2>
            <ul>
              <li>회원 식별 및 본인확인, 회원제 서비스 제공</li>
              <li>교회 홈페이지 제작·운영 및 성도·출석 관리 기능 제공</li>
              <li>유료서비스 이용에 따른 요금 결제·정산 및 이용 기간 관리</li>
              <li>고객 문의 응대, 공지사항 전달 등 원활한 서비스 운영</li>
              <li>부정 이용 방지, 서비스 개선 및 통계 분석</li>
              <li>동의한 이용자에 대한 이벤트·혜택 등 마케팅 정보 제공</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>제3조 (개인정보의 보유 및 이용기간)</h2>
            <ol>
              <li>회사는 원칙적으로 이용자의 개인정보를 회원 탈퇴 시 또는 수집·이용 목적이 달성될 때까지 보유·이용하며, 목적 달성 후에는 지체 없이 파기합니다.</li>
              <li>다만 관련 법령에 따라 다음의 정보는 명시된 기간 동안 보관합니다.
                <ul>
                  <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                  <li>대금 결제 및 재화 등의 공급에 관한 기록: 5년 (동법)</li>
                  <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (동법)</li>
                  <li>접속 로그 등 통신사실확인자료: 3개월 (통신비밀보호법)</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="legal-section">
            <h2>제4조 (개인정보의 제3자 제공)</h2>
            <p>
              회사는 이용자의 개인정보를 본 방침에 명시한 범위를 초과하여 제3자에게 제공하지 않습니다. 다만 이용자가 사전에 동의한
              경우 또는 법령에 따라 요구되는 경우에는 예외로 합니다.
            </p>
          </section>

          <section className="legal-section">
            <h2>제5조 (개인정보 처리의 위탁)</h2>
            <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 외부에 위탁하고 있습니다.</p>
            <ul>
              <li>Amazon Web Services, Inc.: 서비스 인프라(데이터 저장) 및 이메일 발송</li>
              <li>주식회사 스탠다드네트웍스(CoolSMS): 휴대전화 본인확인 및 문자(SMS/LMS) 발송</li>
              <li>Google LLC: 서비스 이용 통계 분석(Google Analytics)</li>
            </ul>
            <p>회사는 위탁계약 체결 시 개인정보가 안전하게 관리될 수 있도록 관련 법령에 따라 필요한 사항을 규정하고 관리·감독합니다.</p>
          </section>

          <section className="legal-section">
            <h2>제6조 (교회 홈페이지 운영과 개인정보)</h2>
            <p>
              교회 관리자가 성도 명단·출석 등 성도의 개인정보를 서비스에 입력하여 처리하는 경우, 회사는 해당 개인정보의 처리를
              위탁받아 저장·관리하는 수탁자의 지위에 있습니다. 해당 개인정보의 수집·이용에 대한 동의 확보 등 개인정보처리자로서의
              책임은 이를 입력·운영하는 교회(교회 관리자)에게 있습니다.
            </p>
          </section>

          <section className="legal-section">
            <h2>제7조 (이용자의 권리와 행사방법)</h2>
            <ol>
              <li>이용자는 언제든지 자신의 개인정보를 조회·수정할 수 있으며, 회원 탈퇴를 통해 개인정보의 수집·이용 동의를 철회할 수 있습니다.</li>
              <li>개인정보의 열람·정정·삭제·처리정지를 요구하려는 경우 제10조의 개인정보 보호책임자에게 연락하시면 지체 없이 조치합니다.</li>
            </ol>
          </section>

          <section className="legal-section">
            <h2>제8조 (개인정보의 파기 절차 및 방법)</h2>
            <ol>
              <li>회사는 보유기간이 경과하거나 처리 목적이 달성된 개인정보를 지체 없이 파기합니다.</li>
              <li>전자적 파일 형태의 정보는 복구할 수 없는 기술적 방법으로 삭제하며, 종이 문서는 분쇄하거나 소각하여 파기합니다.</li>
            </ol>
          </section>

          <section className="legal-section">
            <h2>제9조 (개인정보의 안전성 확보조치)</h2>
            <ul>
              <li>비밀번호의 암호화 저장 및 전송 구간 암호화(SSL) 적용</li>
              <li>개인정보 접근 권한의 최소화 및 접근 통제</li>
              <li>내부 관리계획 수립 및 접속 기록 관리</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>제10조 (쿠키 등 자동 수집 장치)</h2>
            <p>
              회사는 서비스 이용 통계 분석을 위해 쿠키(cookie)를 사용할 수 있습니다. 이용자는 웹 브라우저 설정을 통해 쿠키 저장을
              거부할 수 있으며, 이 경우 일부 서비스 이용에 제한이 있을 수 있습니다. 랜딩 페이지에서는 Google Analytics를 통해
              접속 통계가 수집됩니다.
            </p>
          </section>

          <section className="legal-section">
            <h2>제11조 (개인정보 보호책임자)</h2>
            <p>회사는 개인정보 처리에 관한 업무를 총괄하고, 관련 문의·불만·피해구제를 처리하기 위하여 개인정보 보호책임자를 두고 있습니다.</p>
            <ul className="legal-contact">
              <li>서비스명: 온교회 (everychurch.co.kr)</li>
              <li>개인정보 보호책임자: 임성준</li>
              <li>사업자등록번호: 329-35-01197</li>
              <li>주소: 서울특별시 방배동 1430</li>
              <li>이메일: <a href="mailto:artinfokorea2022@gmail.com">artinfokorea2022@gmail.com</a></li>
              <li>고객지원: <a href="http://pf.kakao.com/_slJXX/chat" target="_blank" rel="noopener noreferrer">카카오톡 채널 문의</a></li>
            </ul>
            <p>
              기타 개인정보 침해에 대한 신고·상담은 개인정보침해신고센터(privacy.kisa.or.kr / 국번없이 118), 대검찰청 사이버수사과,
              경찰청 사이버수사국 등에 문의하실 수 있습니다.
            </p>
          </section>

          <section className="legal-section">
            <h2>제12조 (개인정보 처리방침의 변경)</h2>
            <p>
              본 방침은 법령·정책 또는 서비스의 변경에 따라 개정될 수 있으며, 변경 시 변경 사항 및 시행일을 서비스 내에 공지합니다.
            </p>
          </section>

          <p className="legal-addendum">부칙 — 본 개인정보 처리방침은 2026년 7월 4일부터 시행합니다.</p>

          <div className="legal-back">
            <Link href="/signup" className="btn btn-secondary">← 회원가입으로 돌아가기</Link>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
