<script lang="ts">
  const currentYear = new Date().getFullYear();
  
  const footerLinks = [
    { href: '/docs', label: 'Documentation' },
    { href: '/api', label: 'API' },
    { href: '/status', label: 'System Status' },
    { href: 'https://github.com/stinkster', label: 'GitHub', external: true }
  ];
</script>

<footer class="footer">
  <div class="footer-content">
    <!-- Brand Section -->
    <div class="footer-section">
      <div class="footer-brand">
        <span class="brand-icon">🦨</span>
        <span class="brand-text">Stinkster</span>
      </div>
      <p class="footer-tagline">SDR, WiFi Scanning & GPS Tracking</p>
    </div>
    
    <!-- Links Section -->
    <div class="footer-section">
      <nav class="footer-nav" aria-label="Footer navigation">
        {#each footerLinks as link}
          <a 
            href={link.href}
            class="footer-link"
            target={link.external ? '_blank' : undefined}
            rel={link.external ? 'noopener noreferrer' : undefined}
          >
            {link.label}
            {#if link.external}
              <svg class="external-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M10 6V10H2V2H6M8 0H12V4M4.5 7.5L11 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            {/if}
          </a>
        {/each}
      </nav>
    </div>
    
    <!-- Copyright -->
    <div class="footer-section">
      <p class="footer-copyright">
        © {currentYear} Stinkster. All rights reserved.
      </p>
    </div>
  </div>
</footer>

<style>
  .footer {
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(10, 10, 15, 0.5);
    margin-top: auto;
  }
  
  .footer-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 2rem 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  @media (min-width: 768px) {
    .footer-content {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
    }
  }
  
  .footer-section {
    text-align: center;
  }
  
  @media (min-width: 768px) {
    .footer-section {
      text-align: left;
    }
    
    .footer-section:last-child {
      text-align: right;
    }
  }
  
  /* Brand */
  .footer-brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: #00ff7f;
    margin-bottom: 0.5rem;
    justify-content: center;
  }
  
  @media (min-width: 768px) {
    .footer-brand {
      justify-content: flex-start;
    }
  }
  
  .brand-icon {
    font-size: 1.25rem;
  }
  
  .brand-text {
    background: linear-gradient(135deg, #00ff7f 0%, #00cc66 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .footer-tagline {
    margin: 0;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
  }
  
  /* Navigation */
  .footer-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    justify-content: center;
  }
  
  @media (min-width: 768px) {
    .footer-nav {
      justify-content: flex-start;
    }
  }
  
  .footer-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    font-size: 0.875rem;
    transition: color 0.2s ease;
  }
  
  .footer-link:hover {
    color: rgba(255, 255, 255, 0.9);
  }
  
  .footer-link:focus {
    outline: none;
    color: #00ff7f;
  }
  
  .footer-link:focus-visible {
    outline: 2px solid #00ff7f;
    outline-offset: 4px;
    border-radius: 2px;
  }
  
  .external-icon {
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }
  
  .footer-link:hover .external-icon {
    opacity: 0.8;
  }
  
  /* Copyright */
  .footer-copyright {
    margin: 0;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.4);
  }
  
  /* Responsive adjustments */
  @media (min-width: 1024px) {
    .footer-nav {
      gap: 2rem;
    }
  }
</style>