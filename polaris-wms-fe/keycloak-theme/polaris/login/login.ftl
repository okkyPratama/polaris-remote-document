<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
    <#elseif section = "form">

<div class="polaris-auth">
  <!-- Left: Brand Panel -->
  <div class="brand-panel">
    <div class="brand-logo">
      <div class="brand-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z"/>
        </svg>
      </div>
      <div>
        <div class="brand-name">POLARIS WMS</div>
        <div class="brand-sub">ASSA &middot; Triputra Group</div>
      </div>
    </div>

    <div class="brand-body">
      <h1 class="brand-tagline">Platform WMS untuk Operasi Gudang Modern</h1>
      <p class="brand-desc">Kelola inventori, operasi inbound &amp; outbound, dan laporan real-time dalam satu platform terintegrasi.</p>
      <div class="brand-badges">
        <span class="brand-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Multi-Gudang
        </span>
        <span class="brand-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Multi-Owner
        </span>
        <span class="brand-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Lot Tracking
        </span>
        <span class="brand-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Cold Chain
        </span>
      </div>
    </div>

    <div class="brand-footer">&copy; 2026 ASSA Logistics &middot; Polaris WMS v1.0 Phase 1</div>
  </div>

  <!-- Right: Form Panel -->
  <div class="form-panel">
    <div class="form-card">
      <div class="form-eyebrow">Warehouse Management System</div>
      <h2 class="form-title">Selamat datang kembali</h2>
      <p class="form-sub">Masuk ke akun Anda untuk melanjutkan</p>

      <#if message?has_content && (message.type='error' || message.type='warning')>
        <div class="error-msg visible">${kcSanitize(message.summary)?no_esc}</div>
      </#if>

      <form action="${url.loginAction}" method="post">
        <div class="form-group">
          <label class="form-lbl" for="username">Email <span class="req">*</span></label>
          <input class="form-input" type="text" id="username" name="username" 
                 value="${(login.username!'')}" 
                 placeholder="nama@perusahaan.com" 
                 autocomplete="username" autofocus>
        </div>
        <div class="form-group">
          <label class="form-lbl" for="password">Kata Sandi <span class="req">*</span></label>
          <input class="form-input" type="password" id="password" name="password" 
                 placeholder="Masukkan kata sandi" 
                 autocomplete="current-password">
        </div>

        <div class="form-actions">
          <#if realm.rememberMe && !usernameHidden??>
            <label class="remember-row">
              <input type="checkbox" id="rememberMe" name="rememberMe" <#if login.rememberMe??>checked</#if>>
              <span>Ingat saya</span>
            </label>
          </#if>
          <#if realm.resetPasswordAllowed>
            <a href="${url.loginResetCredentialsUrl}" class="forgot-link">Lupa kata sandi?</a>
          </#if>
        </div>

        <button class="btn-submit" type="submit">Masuk</button>
      </form>

      <div class="version-note">Polaris WMS Phase 1 &middot; Build 2026.06</div>
    </div>
  </div>
</div>

    </#if>
</@layout.registrationLayout>
