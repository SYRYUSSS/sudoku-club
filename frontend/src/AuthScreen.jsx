import React, { useState } from 'react'
import { ArrowRight, LockKeyhole, LogIn, Sparkles, UserPlus } from 'lucide-react'
import { apiFetch } from './api'

export default function AuthScreen({ onAuthSuccess, onShowKit }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isRegister = mode === 'register'

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (isRegister && password !== confirmation) {
      setError('Пароли не совпадают')
      return
    }
    setBusy(true)
    try {
      const response = await apiFetch(isRegister ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: JSON.stringify(isRegister ? { user: { name, email, password, password_confirmation: confirmation } } : { email, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.errors?.join(', ') || data.error || 'Не удалось войти')
      await onAuthSuccess(data.user)
    } catch (requestError) {
      setError(requestError.message || 'Не удалось подключиться к серверу')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <a className="brand" href="#top"><span className="brand-mark"><span>9</span><span>×</span><span>9</span></span><span className="brand-name">sudoku<span>club</span></span></a>
        <button className="nav-link" onClick={onShowKit}>UI Kit проекта <ArrowRight size={13} /></button>
      </header>
      <section className="auth-layout">
        <div className="auth-intro">
          <div className="eyebrow"><Sparkles size={13} /> МЕСТО ДЛЯ СПОКОЙНОЙ ИГРЫ</div>
          <h1>Цифры на месте.<br /><span>Мысли тоже.</span></h1>
          <p>Войдите, чтобы продолжить партию, сохранить прогресс и попасть в таблицу лидеров.</p>
          <div className="auth-feature-list"><span><i>01</i> Прогресс остается с вами</span><span><i>02</i> Результаты в общем рейтинге</span><span><i>03</i> Играйте с любого устройства</span></div>
        </div>
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-card-icon">{isRegister ? <UserPlus size={20} /> : <LockKeyhole size={20} />}</div>
          <div className="section-kicker">ВАШ ЛИЧНЫЙ ПРОФИЛЬ</div>
          <h2>{isRegister ? 'Создать аккаунт' : 'С возвращением'}</h2>
          <p className="auth-subtitle">{isRegister ? 'Несколько секунд — и можно начинать.' : 'Войдите, чтобы продолжить свою игру.'}</p>
          {isRegister && <label className="auth-label">Имя<input required minLength={2} maxLength={30} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Как к вам обращаться" /></label>}
          <label className="auth-label">Электронная почта<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label className="auth-label">Пароль<input required minLength={8} type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? 'Не менее 8 символов' : 'Ваш пароль'} /></label>
          {isRegister && <label className="auth-label">Повторите пароль<input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Еще раз пароль" /></label>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="primary-button auth-submit" disabled={busy}>{busy ? 'Подождите…' : isRegister ? 'Создать аккаунт' : 'Войти'} <ArrowRight size={15} /></button>
          <div className="auth-switch">{isRegister ? 'Уже есть аккаунт?' : 'Впервые здесь?'} <button type="button" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError('') }}>{isRegister ? 'Войти' : 'Создать аккаунт'}</button></div>
          <div className="auth-session"><LogIn size={13} /> Защищенная сессия сохраняет ваш вход</div>
        </form>
      </section>
      <footer className="footer auth-footer"><span>© 2026 sudoku club</span><span>Сделано для ясной головы <span className="footer-heart">♥</span></span></footer>
    </main>
  )
}
