type IconProps = { className?: string }

export function IconEye({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.677 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.678-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z"
      />
    </svg>
  )
}

export function IconMenu({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" />
    </svg>
  )
}

export function IconEdit({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
      <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
    </svg>
  )
}

export function IconHome({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.25 8.25a.75.75 0 1 1-1.06 1.06l-.72-.72V19.5a1.5 1.5 0 0 1-1.5 1.5h-3a.75.75 0 0 1-.75-.75V16.5a1.5 1.5 0 0 0-1.5-1.5h-1.5a1.5 1.5 0 0 0-1.5 1.5v3.75a.75.75 0 0 1-.75.75h-3a1.5 1.5 0 0 1-1.5-1.5v-7.06l-.72.72a.75.75 0 0 1-1.06-1.06l8.25-8.25Z" />
    </svg>
  )
}

export function IconFile({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M6.75 2.25A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V9.31a2.25 2.25 0 0 0-.659-1.591l-4.81-4.81a2.25 2.25 0 0 0-1.591-.659H6.75Zm6.75.99 4.51 4.51h-3.51a1 1 0 0 1-1-1V3.24Z" />
    </svg>
  )
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567l-.164.985c-.02.12-.115.26-.297.35a7.6 7.6 0 0 0-.657.38c-.174.111-.336.111-.452.061l-.933-.4a1.875 1.875 0 0 0-2.222.674l-.928 1.607a1.875 1.875 0 0 0 .432 2.385l.777.622c.098.078.166.239.166.457a7.5 7.5 0 0 0 0 .759c0 .218-.068.38-.166.457l-.777.622a1.875 1.875 0 0 0-.432 2.385l.928 1.607a1.875 1.875 0 0 0 2.222.674l.933-.4c.116-.05.278-.05.452.061.209.14.43.267.657.38.182.09.277.23.297.35l.164.985a1.875 1.875 0 0 0 1.85 1.567h1.844c.917 0 1.699-.663 1.85-1.567l.164-.985c.02-.12.115-.26.297-.35a7.6 7.6 0 0 0 .657-.38c.174-.111.336-.111.452-.061l.933.4a1.875 1.875 0 0 0 2.222-.674l.928-1.607a1.875 1.875 0 0 0-.432-2.385l-.777-.622c-.098-.078-.166-.239-.166-.457a7.5 7.5 0 0 0 0-.759c0-.218.068-.38.166-.457l.777-.622a1.875 1.875 0 0 0 .432-2.385l-.928-1.607a1.875 1.875 0 0 0-2.222-.674l-.933.4c-.116.05-.278.05-.452-.061a7.6 7.6 0 0 0-.657-.38c-.182-.09-.277-.23-.297-.35l-.164-.985a1.875 1.875 0 0 0-1.85-1.567h-1.844ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
      />
    </svg>
  )
}

export function IconSchedule({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25v13.5A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75V5.25Zm4.5 2.25a.75.75 0 0 0 0 1.5h9a.75.75 0 0 0 0-1.5h-9Zm0 4.5a.75.75 0 0 0 0 1.5h9a.75.75 0 0 0 0-1.5h-9Zm0 4.5a.75.75 0 0 0 0 1.5h5.25a.75.75 0 0 0 0-1.5H7.5Z"
      />
    </svg>
  )
}

export function IconPlay({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" />
    </svg>
  )
}

export function IconPause({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z"
      />
    </svg>
  )
}

export function IconReset({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z"
      />
    </svg>
  )
}

export function IconCalendar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3a.75.75 0 0 1 1.5 0v1.5h.75a2.25 2.25 0 0 1 2.25 2.25v12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18.75v-12A2.25 2.25 0 0 1 5.25 4.5H6V3a.75.75 0 0 1 .75-.75ZM4.5 9v9.75c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75V9h-15Z"
      />
      <path d="M7.25 11.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM11 11.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM14.75 11.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM7.25 15a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM11 15a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
    </svg>
  )
}

export function IconCheckCircle({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm4.28 7.53a.75.75 0 0 0-1.06-1.06l-4.72 4.72-1.72-1.72a.75.75 0 1 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l5.25-5.25Z"
      />
    </svg>
  )
}

export function IconFlag({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3 2.25a.75.75 0 0 1 .75.75v.62c1.153-.36 2.352-.62 3.5-.62 1.65 0 2.847.634 3.887.634.9 0 1.68-.257 2.613-.634a.75.75 0 0 1 1.03.696v8.242a.75.75 0 0 1-.47.696c-.933.377-1.714.634-2.613.634-1.04 0-2.237-.634-3.887-.634-1.148 0-2.347.26-3.5.62V21a.75.75 0 0 1-1.5 0V3A.75.75 0 0 1 3 2.25Z" />
    </svg>
  )
}

export function IconClock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2.25a9.75 9.75 0 1 0 0 19.5 9.75 9.75 0 0 0 0-19.5ZM12.75 7.5a.75.75 0 0 0-1.5 0v4.19l-2.7 2.7a.75.75 0 1 0 1.06 1.06l3-3a.75.75 0 0 0 .22-.53V7.5Z"
      />
    </svg>
  )
}

export function IconChartBar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3 13.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

export function IconBook({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
    </svg>
  )
}

export function IconTable({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.375 4.5A1.125 1.125 0 0 1 4.5 3.375h15A1.125 1.125 0 0 1 20.625 4.5v15a1.125 1.125 0 0 1-1.125 1.125h-15A1.125 1.125 0 0 1 3.375 19.5v-15Zm1.5.375v3.75h4.5v-3.75h-4.5Zm6 0v3.75h6v-3.75h-6Zm-6 5.25v3.75h4.5v-3.75h-4.5Zm6 0v3.75h6v-3.75h-6Zm-6 5.25v3h4.5v-3h-4.5Zm6 0v3h6v-3h-6Z"
      />
    </svg>
  )
}

export function IconStar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354l-4.627 2.827c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006Z"
      />
    </svg>
  )
}

export function IconAdjustments({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 3a.75.75 0 0 1 .75.75V7.5h.75a.75.75 0 0 1 0 1.5h-.75v11.25a.75.75 0 0 1-1.5 0V9h-.75a.75.75 0 0 1 0-1.5h.75V3.75A.75.75 0 0 1 6 3Zm6 0a.75.75 0 0 1 .75.75v3.75h.75a.75.75 0 0 1 0 1.5h-.75v11.25a.75.75 0 0 1-1.5 0V9h-.75a.75.75 0 0 1 0-1.5h.75V3.75A.75.75 0 0 1 12 3Zm6 0a.75.75 0 0 1 .75.75v7.5h.75a.75.75 0 0 1 0 1.5h-.75v6a.75.75 0 0 1-1.5 0v-6h-.75a.75.75 0 0 1 0-1.5h.75v-7.5A.75.75 0 0 1 18 3Z"
      />
    </svg>
  )
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.5 3.75a6.75 6.75 0 1 0 4.243 12.007l4.25 4.25a.75.75 0 1 0 1.06-1.06l-4.25-4.25A6.75 6.75 0 0 0 10.5 3.75Zm-5.25 6.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Z"
      />
    </svg>
  )
}

export function IconArrowUp({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.47 4.72a.75.75 0 0 1 1.06 0l6.75 6.75a.75.75 0 1 1-1.06 1.06l-5.47-5.47V19.5a.75.75 0 0 1-1.5 0V7.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06l6.75-6.75Z"
      />
    </svg>
  )
}

export function IconClipboardList({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 2.25a.75.75 0 0 0-.75.75v.75H6A2.25 2.25 0 0 0 3.75 6v13.5A2.25 2.25 0 0 0 6 21.75h12A2.25 2.25 0 0 0 20.25 19.5V6A2.25 2.25 0 0 0 18 3.75h-2.25V3a.75.75 0 0 0-.75-.75h-6Zm5.25 3V4.5h-4.5v.75a.75.75 0 0 1-.75.75H6.75v13.5h10.5V6h-1.5a.75.75 0 0 1-.75-.75ZM7.5 9.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Zm0 3.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Zm0 3.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z"
      />
    </svg>
  )
}
