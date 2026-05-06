/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps { siteName: string; confirmationUrl: string }

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefinir sua senha no {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Casamenteiro</Text>
        <Heading style={h1}>Redefinir sua senha</Heading>
        <Text style={text}>Recebemos um pedido para redefinir a senha da sua conta no {siteName}. Clique no botão abaixo para escolher uma nova senha.</Text>
        <Button style={button} href={confirmationUrl}>Redefinir senha</Button>
        <Text style={footer}>Se você não solicitou a redefinição, ignore este e-mail. Sua senha continuará a mesma.</Text>
      </Container>
    </Body>
  </Html>
)
export default RecoveryEmail
const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif', padding: '40px 0' }
const container = { backgroundColor: '#FAFAF7', padding: '40px 32px', maxWidth: '560px', borderRadius: '12px', border: '1px solid #E6E1D9' }
const brand = { fontSize: '14px', fontWeight: '600' as const, color: '#D9905A', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 24px' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1F1D1B', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#3A352F', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#D9905A', textDecoration: 'underline' }
const button = { backgroundColor: '#D9905A', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '999px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#6B645C', margin: '32px 0 0', lineHeight: '1.5' }
const codeStyle = { fontFamily: 'monospace', fontSize: '28px', fontWeight: '700' as const, color: '#D9905A', letterSpacing: '0.2em', margin: '24px 0', textAlign: 'center' as const }
