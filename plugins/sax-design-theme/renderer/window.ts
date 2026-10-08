const mode = document.querySelector<HTMLButtonElement>('#mode')!;
const maximize = document.querySelector<HTMLButtonElement>('#maximize')!;
const theme = document.querySelector<HTMLLinkElement>('#theme')!;
mode.onclick = () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  theme.href = `../themes/sax-${dark ? 'dark' : 'light'}.css`;
  mode.textContent = dark ? '浅色' : '深色';
};
maximize.onclick = () => {
  const max = document.documentElement.dataset.maximized !== 'true';
  document.documentElement.dataset.maximized = String(max);
  maximize.textContent = max ? '还原' : '最大化';
  maximize.setAttribute('aria-pressed', String(max));
};
export {};
