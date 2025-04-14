import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PW,
      },
    });
  }

  async sendEmailConfirmMail(email: string, verificationCode: number) {
    const mailOptions = {
      to: email,
      subject: '홍풍:회원가입 인증번호 전송',
      html: `<html>
                <body style="display: flex;justify-content: center; height:420px">
                    <div
                        style="display: flex; width:500px; flex-direction: column; align-items: center; border-radius:5px; border: 1px solid #E7E7E7;">
                        <div
                            style="display: flex; flex-direction: column; background-color: #ECF3FF; width: 100%; color: #001D4B; text-align:center; border-radius:5px; align-items: center; justify-content: center; padding-top: 20px; padding-bottom: 20px; gap:12px">
                            <div style="font-weight: 800;"> 홍익대학교 풍물연습실 예약 시스템; 홍풍</div>
                            <div style="font-size: 32px; font-weight: 600;">회원가입 인증번호</div>
                        </div>
                        <div style="height: 160px; display: flex; align-items: center;">
                            <div
                                style="border-radius:10px; display: flex; background-color: #ECF3FF; width: 140px; height: 60px;align-items: center;font-size: 30px; justify-content: center; font-weight: 600;color: #002957; ">
                                ${verificationCode}</div>
                        </div>
                        <footer
                            style="display: flex; flex:1; flex-direction: column; height: 120px;background-color: #E7E7E7; width: 100%; justify-content: end; ">
                            <div style="margin: 2px 10px; ">문의 이메일: ajtwoddl1236@naver.com</div>
                            <div style="margin: 8px 10px; ">개발자: 강윤호(산틀 18)</div>
                        </footer>
                    </div>
                </body>
              </html>`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('send')
      console.log('Email sent: ' + info.response);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendPasswordModifyMail(email: string, verificationCode: number) {
    const mailOptions = {
      to: email,
      subject: '홍풍:비밀번호 재설정 인증번호 전송',
      html: `<html>
                <body style="display: flex;justify-content: center; height:420px">
                    <div
                        style="display: flex; width:500px; flex-direction: column; align-items: center; border-radius:5px; border: 1px solid #E7E7E7;">
                        <div
                            style="display: flex; flex-direction: column; background-color: #ECF3FF; width: 100%; color: #001D4B; text-align:center; border-radius:5px; align-items: center; justify-content: center; padding-top: 20px; padding-bottom: 20px; gap:12px">
                            <div style="font-weight: 800;"> 홍익대학교 풍물연습실 예약 시스템; 홍풍</div>
                            <div style="font-size: 32px; font-weight: 600;">비밀번호 재설정 인증번호</div>
                        </div>
                        <div style="height: 160px; display: flex; align-items: center;">
                            <div
                                style="border-radius:10px; display: flex; background-color: #ECF3FF; width: 140px; height: 60px;align-items: center;font-size: 30px; justify-content: center; font-weight: 600;color: #002957; ">
                                ${verificationCode}</div>
                        </div>
                        <footer
                            style="display: flex; flex:1; flex-direction: column; height: 120px;background-color: #E7E7E7; width: 100%; justify-content: end; ">
                            <div style="margin: 2px 10px; ">문의 이메일: ajtwoddl1236@naver.com</div>
                            <div style="margin: 8px 10px; ">개발자: 강윤호(산틀 18)</div>
                        </footer>
                    </div>
                </body>
              </html>`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent: ' + info.response);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendSignUpAcceptedMail(email: string, name: string) {
    const mailOptions = {
      to: email,
      subject: '홍풍:회원가입 수락 안내',
      html: `<html>
                <body style="display: flex;justify-content: center; height:420px">
                    <div
                        style="display: flex; width:500px; flex-direction: column; align-items: center; border-radius:5px; border: 1px solid #E7E7E7;">
                        <div
                            style="display: flex; flex-direction: column; background-color: #ECF3FF; width: 100%; color: #001D4B; text-align:center; border-radius:5px; align-items: center; justify-content: center; padding-top: 20px; padding-bottom: 20px; gap:12px">
                            <div style="font-weight: 800;"> 홍익대학교 풍물연습실 예약 시스템; 홍풍</div>
                            <div style="font-size: 32px; font-weight: 600;">회원가입 완료 안내</div>
                        </div>
                        <div style="height: 160px; width:100%; display: flex; align-items: flex-start;">
                            <div
                                style="display: flex; padding: 16px 12px; flex-direction:column; flex; width: 100%; height: auto; align-items: flex-start; font-size: 16px; justify-content: center; font-weight: 600;color: #002957; ">
                               <div style="font-weight: 600; font-size:20px;">회원 가입이 수락되었어요!</div><br>${name}님의 회원가입을 진심으로 축하해요.<br>활발한 활동을 기대할게요!</div>
                        </div>
                        <footer
                            style="display: flex; flex:1; flex-direction: column; height: 120px;background-color: #E7E7E7; width: 100%; justify-content: end; ">
                            <div style="margin: 2px 10px; ">문의 이메일: ajtwoddl1236@naver.com</div>
                            <div style="margin: 8px 10px; ">개발자: 강윤호(산틀 18)</div>
                        </footer>
                    </div>
                </body>
              </html>`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent: ' + info.response);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendSignUpRequestedMail(email: string, requestCount:number) {
    const mailOptions = {
      to: email,
      subject: '홍풍:회원가입 요청 알림',
      html: `<html>
                <body style="display: flex;justify-content: center; height:420px">
                    <div
                        style="display: flex; width:500px; flex-direction: column; align-items: center; border-radius:5px; border: 1px solid #E7E7E7;">
                        <div
                            style="display: flex; flex-direction: column; background-color: #ECF3FF; width: 100%; color: #001D4B; text-align:center; border-radius:5px; align-items: center; justify-content: center; padding-top: 20px; padding-bottom: 20px; gap:12px">
                            <div style="font-weight: 800;"> 홍익대학교 풍물연습실 예약 시스템; 홍풍</div>
                            <div style="font-size: 32px; font-weight: 600;">회원가입 요청 알림</div>
                        </div>
                        <div style="height: 160px; width:100%; display: flex; align-items: flex-start;">
                            <div
                                style="display: flex; padding: 16px 12px; flex-direction:column; flex; width: 100%; height: auto; align-items: flex-start; font-size: 16px; justify-content: center; font-weight: 600;color: #002957; ">
                               <div style="font-weight: 600; font-size:20px;">회원 가입 요청이 ${requestCount}건 쌓여있어요!</div><br>빨리 회원가입을 허가해줘야해요.<br><br><a href="https://admin.hongpung.com">관리자 페이지로 이동</a></div>
                        </div>
                        <footer
                            style="display: flex; flex:1; flex-direction: column; height: 120px;background-color: #E7E7E7; width: 100%; justify-content: end; ">
                            <div style="margin: 2px 10px; ">문의 이메일: ajtwoddl1236@naver.com</div>
                            <div style="margin: 8px 10px; ">개발자: 강윤호(산틀 18)</div>
                        </footer>
                    </div>
                </body>
              </html>`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent: ' + info.response);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}