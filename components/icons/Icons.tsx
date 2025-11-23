
import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement> & { title?: string };

export const CalendarIcon = ({ title, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M-4.5 12h22.5" />
  </svg>
);

export const ClockIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const UserIcon = ({ title, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

export const UsersIcon = ({ title, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

export const PhoneIcon = ({ title, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

export const MapPinIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
);

export const CurrencyDollarIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const SparklesIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 21.75l-.648-1.188a2.25 2.25 0 01-1.4-1.4l-1.188-.648 1.188-.648a2.25 2.25 0 011.4-1.4l.648-1.188.648 1.188a2.25 2.25 0 01-1.4 1.4z" />
    </svg>
);

export const XMarkIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const TrendingUpIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-3.94.886M21.75 5.25v6" />
    </svg>
);

export const DocumentTextIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

export const ShoppingBagIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.658-.463 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

export const PlusCircleIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const PlusIcon = ({ title, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export const TrashIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

export const PencilIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

export const TruckIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 013.375-3.375h9.75a3.375 3.375 0 013.375 3.375v1.875m-17.25 4.5L5.625 12H18.375l1.875 6.75M5.625 12V3.75a2.25 2.25 0 012.25-2.25h3.75a2.25 2.25 0 012.25 2.25v8.25" />
    </svg>
);

export const ClipboardDocumentCheckIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" />
    </svg>
);

export const CreditCardIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
);

export const PaperAirplaneIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
);

export const ArrowTopRightOnSquareIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5 0L18 3m0 0h-3.75M18 3v3.75" />
    </svg>
);

export const MagnifyingGlassIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

export const PrinterIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.319 0a1.125 1.125 0 00-1.12-1.227H7.231c-.662 0-1.18.568-1.12 1.227m11.319 0L16 21.865m-1.161 0a1.125 1.125 0 10-1.627-1.627 1.125 1.125 0 001.627 1.627zM6.34 18L5 21.865m-1.161 0a1.125 1.125 0 10-1.627-1.627 1.125 1.125 0 001.627 1.627m10.94-11.25c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-10.5c-.621 0-1.125-.504-1.125-1.125v-4.5c0-.621.504-1.125 1.125-1.125h10.5zM15.375 5.875c0-.621-.504-1.125-1.125-1.125H9.75c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h4.5c.621 0 1.125-.504 1.125-1.125v-1.5z" />
    </svg>
);

export const ArrowUturnLeftIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
);

export const InstagramIcon = ({ title, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    {title && <title>{title}</title>}
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.585-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.585-.012-4.85-.07c-3.25-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.85s.012-3.584.07-4.85c.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.85-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.059-1.281.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98-1.281-.058-1.689-.072-4.948-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759 6.162-6.162-2.759 6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.441 1.441 1.441 1.441-.645 1.441-1.44-1.441-1.44z" />
  </svg>
);

export const FacebookIcon = ({ title, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    {title && <title>{title}</title>}
    <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.494v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.142v3.24h-1.918c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.323-1.325z"/>
  </svg>
);


export const ChatBubbleOvalLeftEllipsisIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.53-.423l-4.28 1.125 1.125-4.28a9.76 9.76 0 01-.423-2.53C6 7.444 10.03 3.75 15 3.75s9 3.694 9 8.25z" />
    </svg>
);

export const DocumentArrowDownIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" />
    </svg>
);

export const CheckCircleIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const XCircleIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const CalendarDaysIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M-4.5 12h22.5" />
    </svg>
);

export const ListBulletIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

export const ChevronLeftIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

export const ChevronRightIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);

export const CogIcon = ({ title, ...props }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.212 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const ScaleIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.48 0-2.194-.643-2.46-1.066-.595-.95-.146-2.256.66-3.345C10.84 15.035 11.38 14.25 12 14.25c.62 0 1.16.785 1.8 1.59.806 1.089 1.255 2.394.66 3.345-.266.423-.98 1.066-2.46 1.066zm11.25-9.75a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0zm-12 0a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" />
    </svg>
);

export const ChartBarIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);

export const ReceiptIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

export const CameraIcon = ({ title, ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
);--- START OF FILE components/SettingsModal.tsx ---

import React, { useState, useMemo } from 'react';
import { AppSettings, updateSettingsInDb, addEmployeeToDb, updateEmployeeInDb, deleteEmployeeFromDb } from '../services/dbService';
import { PricingSettings, MenuPackage, Flavor, SalsaProduct, PricingTier, Employee } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon, PencilIcon, ScaleIcon, CurrencyDollarIcon, ClockIcon, SparklesIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, ReceiptIcon, UsersIcon } from './icons/Icons';
import { SUGGESTED_DESCRIPTIONS } from '../data/mockData';

interface SettingsModalProps {
    settings: AppSettings;
    onClose: () => void;
}

export default function SettingsModal({ settings, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'menu' | 'pricing' | 'prep' | 'costs' | 'scheduling' | 'expenses' | 'employees'>('menu');
    
    const [empanadaFlavors, setEmpanadaFlavors] = useState<Flavor[]>(settings.empanadaFlavors);
    const [pricing, setPricing] = useState<PricingSettings>(settings.pricing);
    const [prepSettings, setPrepSettings] = useState<AppSettings['prepSettings']>(settings.prepSettings);
    const [scheduling, setScheduling] = useState<AppSettings['scheduling']>(settings.scheduling);
    const [laborWage, setLaborWage] = useState<number>(settings.laborWage);
    const [materialCosts, setMaterialCosts] = useState<Record<string, number>>(settings.materialCosts);
    const [discoCosts, setDiscoCosts] = useState<{mini: number, full: number}>(settings.discoCosts);
    const [expenseCategories, setExpenseCategories] = useState<string[]>(settings.expenseCategories);
    
    const employees = settings.employees || []; 
    const [newEmpName, setNewEmpName] = useState('');
    const [newEmpRate, setNewEmpRate] = useState('');
    const [newEmpMini, setNewEmpMini] = useState('');
    const [newEmpFull, setNewEmpFull] = useState('');
    const [newEmpColor, setNewEmpColor] = useState('#3b82f6');
    const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

    const [newFlavorName, setNewFlavorName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [packageForm, setPackageForm] = useState<Partial<MenuPackage>>({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '' });
    const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
    const [newSalsaName, setNewSalsaName] = useState('');
    const [newSalsaPrice, setNewSalsaPrice] = useState('');
    const [newTier, setNewTier] = useState<{type: 'mini'|'full', minQty: string, price: string}>({ type: 'mini', minQty: '', price: '' });
    const [newCategory, setNewCategory] = useState('');

    const handleSave = async () => {
        setIsSaving(true);
        const syncedFullFlavors: Flavor[] = empanadaFlavors.map(f => ({ ...f, name: `Full ${f.name}` }));
        const settingsToSave: Partial<AppSettings> = {
            empanadaFlavors, fullSizeEmpanadaFlavors: syncedFullFlavors, pricing, prepSettings, scheduling, laborWage, materialCosts, discoCosts, expenseCategories
        };
        try { await updateSettingsInDb(settingsToSave); } catch (e) { console.error(e); alert("Failed to save settings."); } finally { setIsSaving(false); onClose(); }
    };

    const handleAddOrUpdateEmployee = async () => {
        if (!newEmpName.trim() || !newEmpRate) return;
        setIsSaving(true);
        try {
            const newEmp: Employee = {
                id: editingEmployeeId || Date.now().toString(),
                name: newEmpName.trim(),
                hourlyRate: parseFloat(newEmpRate) || 0,
                speedMini: parseInt(newEmpMini) || 40,
                speedFull: parseInt(newEmpFull) || 25,
                color: newEmpColor,
                isActive: true
            };

            if (editingEmployeeId) {
                await updateEmployeeInDb(newEmp);
            } else {
                await addEmployeeToDb(newEmp);
            }
            
            setNewEmpName(''); setNewEmpRate(''); setNewEmpMini(''); setNewEmpFull(''); setEditingEmployeeId(null);
        } catch (e) {
            console.error("Error saving employee", e);
            alert("Failed to save employee.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEmployee = async (id: string) => {
        if (window.confirm("Remove this employee?")) {
            await deleteEmployeeFromDb(id);
            if (editingEmployeeId === id) {
                 setNewEmpName(''); setNewEmpRate(''); setNewEmpMini(''); setNewEmpFull(''); setEditingEmployeeId(null);
            }
        }
    };

    const handleEditEmployee = (emp: Employee) => {
        setNewEmpName(emp.name);
        setNewEmpRate(String(emp.hourlyRate));
        setNewEmpMini(String(emp.speedMini));
        setNewEmpFull(String(emp.speedFull));
        setNewEmpColor(emp.color);
        setEditingEmployeeId(emp.id);
    };
    
    const handleCancelEditEmployee = () => {
        setNewEmpName(''); setNewEmpRate(''); setNewEmpMini(''); setNewEmpFull(''); setEditingEmployeeId(null);
    };

    const addFlavor = () => { if (newFlavorName.trim()) { setEmpanadaFlavors([...empanadaFlavors, { name: newFlavorName.trim(), visible: true, isSpecial: false }]); setNewFlavorName(''); } };
    const autoFillDescriptions = () => { setEmpanadaFlavors(empanadaFlavors.map(f => (!f.description ? { ...f, description: SUGGESTED_DESCRIPTIONS[f.name] || undefined } : f))); alert('Descriptions populated! Save to apply.'); };
    const toggleFlavorVisibility = (i: number) => { const u = [...empanadaFlavors]; u[i].visible = !u[i].visible; setEmpanadaFlavors(u); };
    const toggleFlavorSpecial = (i: number) => { const u = [...empanadaFlavors]; u[i].isSpecial = !u[i].isSpecial; setEmpanadaFlavors(u); };
    const updateFlavorDescription = (i: number, d: string) => { const u = [...empanadaFlavors]; u[i].description = d; setEmpanadaFlavors(u); };
    const updateFlavorSurcharge = (i: number, v: string) => { const u = [...empanadaFlavors]; u[i].surcharge = parseFloat(v) || undefined; setEmpanadaFlavors(u); };
    const removeFlavor = (i: number) => { setEmpanadaFlavors(empanadaFlavors.filter((_, idx) => idx !== i)); };
    const handleAddOrUpdatePackage = () => { if (!packageForm.name || !packageForm.price || !packageForm.quantity) return; const pkg: MenuPackage = { id: editingPackageId || Date.now().toString(), name: packageForm.name, itemType: packageForm.itemType as 'mini'|'full', quantity: Number(packageForm.quantity), price: Number(packageForm.price), maxFlavors: Number(packageForm.maxFlavors)||Number(packageForm.quantity), increment: Number(packageForm.increment)||1, visible: packageForm.visible ?? true, isSpecial: packageForm.isSpecial ?? false }; let updated = pricing.packages || []; updated = editingPackageId ? updated.map(p => p.id === editingPackageId ? pkg : p) : [...updated, pkg]; setPricing({...pricing, packages: updated}); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '' }); setEditingPackageId(null); };
    const handleEditPackageClick = (pkg: MenuPackage) => { setPackageForm({ ...pkg, increment: pkg.increment || 10 }); setEditingPackageId(pkg.id); };
    const removePackage = (id: string) => { setPricing({...pricing, packages: pricing.packages.filter(p => p.id !== id)}); if(editingPackageId === id) { setEditingPackageId(null); setPackageForm({ itemType: 'mini', quantity: 12, price: 20, maxFlavors: 4, increment: 1, visible: true, isSpecial: false, name: '' }); } };
    const togglePackageVisibility = (id: string) => { setPricing({...pricing, packages: pricing.packages.map(p => p.id === id ? { ...p, visible: !p.visible } : p)}); };
    const addSalsa = () => { if (!newSalsaName || !newSalsaPrice) return; setPricing({...pricing, salsas: [...(pricing.salsas||[]), {id: `salsa-${Date.now()}`, name: newSalsaName, price: parseFloat(newSalsaPrice)||0, visible: true}]}); setNewSalsaName(''); setNewSalsaPrice(''); };
    const removeSalsa = (id: string) => { setPricing({...pricing, salsas: pricing.salsas.filter(s => s.id !== id)}); };
    const updateSalsaPrice = (id: string, p: string) => { setPricing({...pricing, salsas: pricing.salsas.map(s => s.id === id ? {...s, price: parseFloat(p)||0} : s)}); };
    const toggleSalsaVisibility = (id: string) => { setPricing({...pricing, salsas: pricing.salsas.map(s => s.id === id ? {...s, visible: !s.visible} : s)}); };
    const updateLbsPer20 = (f: string, v: string) => { setPrepSettings({...prepSettings, lbsPer20: {...prepSettings.lbsPer20, [f]: parseFloat(v)||0}}); };
    const updateMaterialCost = (f: string, v: string) => { setMaterialCosts({...materialCosts, [f]: parseFloat(v)||0}); };
    const addTier = () => { const minQ = parseInt(newTier.minQty); const p = parseFloat(newTier.price); if (!minQ || isNaN(p)) return; const currentTiers = pricing[newTier.type].tiers || []; const updated = [...currentTiers.filter(t => t.minQuantity !== minQ), { minQuantity: minQ, price: p }]; updated.sort((a,b) => a.minQuantity - b.minQuantity); setPricing({ ...pricing, [newTier.type]: { ...pricing[newTier.type], tiers: updated } }); setNewTier({ ...newTier, minQty: '', price: '' }); };
    const removeTier = (type: 'mini'|'full', minQty: number) => { setPricing({ ...pricing, [type]: { ...pricing[type], tiers: (pricing[type].tiers || []).filter(t => t.minQuantity !== minQty) } }); };
    const toggleClosedDay = (dayIndex: number) => { const current = scheduling.closedDays || []; if (current.includes(dayIndex)) { setScheduling({ ...scheduling, closedDays: current.filter(d => d !== dayIndex) }); } else { setScheduling({ ...scheduling, closedDays: [...current, dayIndex].sort() }); } };
    const handleDateClick = (dateStr: string) => { setSelectedDate(dateStr); };
    const updateDateOverride = (dateStr: string, type: 'default' | 'closed' | 'custom', start?: string, end?: string) => { const newOverrides = { ...(scheduling.dateOverrides || {}) }; if (type === 'default') { delete newOverrides[dateStr]; } else if (type === 'closed') { newOverrides[dateStr] = { isClosed: true }; } else if (type === 'custom') { newOverrides[dateStr] = { isClosed: false, customHours: { start: start || scheduling.startTime, end: end || scheduling.endTime } }; } setScheduling({ ...scheduling, dateOverrides: newOverrides }); };
    const calendarGrid = useMemo(() => { const year = calendarViewDate.getFullYear(); const month = calendarViewDate.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDayOfWeek = new Date(year, month, 1).getDay(); const cells = []; for (let i = 0; i < firstDayOfWeek; i++) cells.push(null); for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i)); return cells; }, [calendarViewDate]);
    const handlePrevMonth = () => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1));
    const addCategory = () => { if (newCategory.trim() && !expenseCategories.includes(newCategory.trim())) { setExpenseCategories([...expenseCategories, newCategory.trim()]); setNewCategory(''); } };
    const removeCategory = (cat: string) => { setExpenseCategories(expenseCategories.filter(c => c !== cat)); };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-brand-tan">
                <header className="p-6 border-b border-brand-tan flex justify-between items-center">
                    <h2 className="text-3xl font-serif text-brand-brown">Store Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex flex-wrap border-b border-gray-200">
                    {['menu', 'pricing', 'scheduling', 'prep', 'costs', 'expenses', 'employees'].map((tab) => (
                         <button
                            key={tab}
                            className={`flex-1 px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors capitalize ${activeTab === tab ? 'border-b-2 border-brand-orange text-brand-orange bg-brand-orange/5' : 'text-gray-500 hover:text-brand-brown hover:bg-gray-50'}`}
                            onClick={() => setActiveTab(tab as any)}
                        >
                            {tab === 'expenses' ? 'Exp. Categories' : tab === 'scheduling' ? 'Scheduling' : tab === 'costs' ? 'Inventory & Costs' : tab === 'prep' ? 'Prep' : tab === 'menu' ? 'Menu' : tab === 'employees' ? 'Employees' : 'Pricing'}
                        </button>
                    ))}
                </div>

                <div className="overflow-y-auto p-6 flex-grow">
                    {activeTab === 'menu' && (<div className="bg-gray-50 p-4 rounded-lg border border-gray-200"><div className="flex justify-between items-center mb-4"><div><h3 className="font-bold text-brand-brown">Empanada Flavors</h3></div><button onClick={autoFillDescriptions} className="text-xs flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"><SparklesIcon className="w-3 h-3"/> Auto-fill</button></div><div className="flex gap-2 mb-4"><input type="text" value={newFlavorName} onChange={e => setNewFlavorName(e.target.value)} placeholder="New flavor name" className="flex-grow rounded border-gray-300 text-sm"/><button onClick={addFlavor} className="bg-brand-orange text-white px-3 rounded"><PlusIcon className="w-5 h-5"/></button></div><div className="space-y-2 max-h-96 overflow-y-auto">{empanadaFlavors.map((f, i) => <div key={i} className="bg-white p-2 rounded shadow-sm text-sm flex items-center justify-between"><span>{f.name}</span><button onClick={() => removeFlavor(i)} className="text-red-500"><TrashIcon className="w-4 h-4"/></button></div>)}</div></div>)}
                    {activeTab === 'pricing' && (<div className="space-y-8"><div><h3 className="font-bold text-brand-brown mb-4">Packages</h3><div className="space-y-3">{pricing.packages?.map(p => <div key={p.id} className="bg-white p-3 rounded border shadow-sm flex justify-between"><span>{p.name}</span><button onClick={() => removePackage(p.id)} className="text-red-500"><TrashIcon className="w-4 h-4"/></button></div>)}</div></div></div>)}
                    {activeTab === 'scheduling' && (<div className="space-y-8"><h3 className="font-bold text-brand-brown">Scheduling</h3><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs">Open</label><input type="time" value={scheduling.startTime} onChange={e => setScheduling({...scheduling, startTime: e.target.value})} className="border rounded p-1 w-full"/></div><div><label className="block text-xs">Close</label><input type="time" value={scheduling.endTime} onChange={e => setScheduling({...scheduling, endTime: e.target.value})} className="border rounded p-1 w-full"/></div></div></div>)}
                    {activeTab === 'prep' && (<div className="space-y-8"><h3 className="font-bold text-brand-brown">Prep Settings</h3><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs">Minis/Hr</label><input type="number" value={prepSettings?.productionRates?.mini} onChange={e => setPrepSettings({...prepSettings, productionRates: {...prepSettings.productionRates, mini: parseFloat(e.target.value)}})} className="border rounded p-1 w-full"/></div></div></div>)}
                    {activeTab === 'costs' && (<div className="space-y-8"><h3 className="font-bold text-brand-brown">Costs</h3><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs">Labor Wage</label><input type="number" value={laborWage} onChange={e => setLaborWage(parseFloat(e.target.value))} className="border rounded p-1 w-full"/></div></div></div>)}
                    {activeTab === 'expenses' && (<div className="space-y-8"><h3 className="font-bold text-brand-brown">Categories</h3><div className="flex gap-2 mb-4"><input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="border rounded p-1 flex-grow"/><button onClick={addCategory} className="bg-brand-orange text-white px-3 rounded"><PlusIcon className="w-4 h-4"/></button></div><div className="space-y-2">{expenseCategories.map(c => <div key={c} className="flex justify-between p-2 bg-gray-50 rounded"><span>{c}</span><button onClick={() => removeCategory(c)} className="text-red-500"><TrashIcon className="w-4 h-4"/></button></div>)}</div></div>)}
                    
                    {activeTab === 'employees' && (
                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-lg border border-brand-tan shadow-sm">
                                <h3 className="font-bold text-brand-brown text-lg mb-4">Employee Roster</h3>
                                <p className="text-sm text-gray-500 mb-4">Add employees to schedule them on the calendar and track labor costs.</p>
                                
                                <div className={`grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 p-4 rounded border items-end transition-colors ${editingEmployeeId ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Name</label>
                                        <input type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} className="w-full rounded border-gray-300 text-sm p-1.5" placeholder="Employee Name"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Wage ($/hr)</label>
                                        <input type="number" step="0.50" value={newEmpRate} onChange={e => setNewEmpRate(e.target.value)} className="w-full rounded border-gray-300 text-sm p-1.5" placeholder="15.00"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Mini/Hr</label>
                                        <input type="number" value={newEmpMini} onChange={e => setNewEmpMini(e.target.value)} className="w-full rounded border-gray-300 text-sm p-1.5" placeholder="40"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Full/Hr</label>
                                        <input type="number" value={newEmpFull} onChange={e => setNewEmpFull(e.target.value)} className="w-full rounded border-gray-300 text-sm p-1.5" placeholder="25"/>
                                    </div>
                                    <div className="md:col-span-5 flex gap-2">
                                        {editingEmployeeId && <button onClick={handleCancelEditEmployee} className="w-full bg-gray-300 text-gray-700 font-bold py-2 rounded text-sm hover:bg-gray-400">Cancel</button>}
                                        <button onClick={handleAddOrUpdateEmployee} className={`w-full text-white font-bold py-2 rounded text-sm shadow-sm hover:bg-opacity-90 flex items-center justify-center gap-2 ${editingEmployeeId ? 'bg-amber-500' : 'bg-brand-orange'}`}>
                                            {editingEmployeeId ? <><CheckCircleIcon className="w-4 h-4"/> Update Employee</> : <><PlusIcon className="w-4 h-4"/> Add Employee</>}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {employees.map(emp => (
                                        <div key={emp.id} className={`flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm ${editingEmployeeId === emp.id ? 'border-amber-500 ring-1 ring-amber-500' : 'border-gray-200'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                    {emp.name.substring(0,2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-brand-brown text-sm">{emp.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        ${emp.hourlyRate.toFixed(2)}/hr • Speed: {emp.speedMini} (m), {emp.speedFull} (f)
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleEditEmployee(emp)} className="text-gray-400 hover:text-brand-brown p-2 hover:bg-gray-100 rounded-full transition-colors">
                                                    <PencilIcon className="w-4 h-4"/>
                                                </button>
                                                <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors">
                                                    <TrashIcon className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {employees.length === 0 && (
                                        <div className="text-center py-8 text-gray-400 italic border-2 border-dashed border-gray-200 rounded-lg">
                                            No employees added yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-6 flex justify-end gap-3 border-t border-brand-tan bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} disabled={isSaving} className="bg-gray-200 text-gray-800 font-semibold px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-brand-orange text-white font-semibold px-6 py-2 rounded-lg shadow-md hover:bg-opacity-90 transition-all disabled:bg-brand-orange/50">
                        {isSaving ? 'Saving...' : <>Save All Changes <CheckCircleIcon className="w-5 h-5" /></>}
                    </button>
                </footer>
            </div>
        </div>
    );
}--- START OF FILE components/ShiftModal.tsx ---

import React, { useState } from 'react';
import { Shift, Employee } from '../types';
import { XMarkIcon, PlusIcon, ClockIcon, CurrencyDollarIcon, TrashIcon } from './icons/Icons';

interface ShiftModalProps {
    employees: Employee[];
    shifts: Shift[];
    date: string; // YYYY-MM-DD
    onClose: () => void;
    onSave: (shift: Shift) => Promise<void>;
    onDelete: (shiftId: string) => Promise<void>;
}

export default function ShiftModal({ employees, shifts, date, onClose, onSave, onDelete }: ShiftModalProps) {
    const [selectedEmp, setSelectedEmp] = useState(employees[0]?.id || '');
    const [start, setStart] = useState('09:00');
    const [end, setEnd] = useState('17:00');
    const [isSaving, setIsSaving] = useState(false);

    // Derived logic for preview
    const emp = employees.find(e => e.id === selectedEmp);
    
    const calculateCost = () => {
        if (!emp) return 0;
        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);
        let hours = (eH + eM/60) - (sH + sM/60);
        if (hours < 0) hours += 24; // Overnight shift
        return hours * emp.hourlyRate;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emp) return;
        setIsSaving(true);

        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);
        let hours = (eH + eM/60) - (sH + sM/60);
        if (hours < 0) hours += 24;

        const newShift: Shift = {
            id: Date.now().toString(),
            employeeId: emp.id,
            employeeName: emp.name,
            date,
            startTime: start,
            endTime: end,
            hours: parseFloat(hours.toFixed(2)),
            laborCost: parseFloat((hours * emp.hourlyRate).toFixed(2))
        };

        await onSave(newShift);
        setIsSaving(false);
    };

    // Filter shifts for this specific day
    const dailyShifts = shifts.filter(s => s.date === date);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-brand-tan">
                <header className="p-4 border-b border-brand-tan flex justify-between items-center bg-brand-tan/10">
                    <div>
                        <h3 className="text-lg font-bold text-brand-brown">Schedule Shifts</h3>
                        <p className="text-xs text-gray-500">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-6 h-6" /></button>
                </header>

                <div className="p-4 space-y-6">
                    {/* List Existing */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase">Scheduled Today</h4>
                        {dailyShifts.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No shifts scheduled.</p>
                        ) : (
                            dailyShifts.map(s => (
                                <div key={s.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-200">
                                    <div>
                                        <p className="font-bold text-sm text-brand-brown">{s.employeeName}</p>
                                        <p className="text-xs text-gray-500">{s.startTime} - {s.endTime} ({s.hours}h)</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-green-700">${s.laborCost.toFixed(2)}</span>
                                        <button onClick={() => onDelete(s.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add New Form */}
                    {employees.length > 0 ? (
                        <form onSubmit={handleSave} className="border-t border-gray-200 pt-4">
                            <h4 className="text-xs font-bold text-brand-orange uppercase mb-3">Add Shift</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">Employee</label>
                                    <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} className="w-full text-sm rounded border-gray-300 p-2">
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.name} (${e.hourlyRate}/hr)</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">Start</label>
                                        <input type="time" value={start} onChange={e => setStart(e.target.value)} className="w-full text-sm rounded border-gray-300 p-2"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">End</label>
                                        <input type="time" value={end} onChange={e => setEnd(e.target.value)} className="w-full text-sm rounded border-gray-300 p-2"/>
                                    </div>
                                </div>
                                <div className="bg-green-50 p-2 rounded text-center text-xs text-green-800 font-medium">
                                    Est. Cost: ${calculateCost().toFixed(2)}
                                </div>
                                <button type="submit" disabled={isSaving} className="w-full bg-brand-brown text-white py-2 rounded-lg text-sm font-bold hover:bg-opacity-90">
                                    {isSaving ? 'Saving...' : 'Add Shift'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <p className="text-sm text-red-500 text-center border-t pt-4">
                            No employees found. Add them in Settings first.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}--- START OF FILE components/CalendarView.tsx ---

import React, { useState, useMemo, useEffect } from 'react';
import { Order, PaymentStatus, Shift, Employee } from '../types';
import { parseOrderDateTime, generateTimeSlots, normalizeDateStr } from '../utils/dateUtils';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, XMarkIcon, UsersIcon } from './icons/Icons';
import DayOrdersModal from './DayOrdersModal';
import ShiftModal from './ShiftModal';
import { getUSHolidays } from '../utils/holidayUtils';
import { AppSettings, saveShiftToDb, deleteShiftFromDb } from '../services/dbService';

interface CalendarViewProps {
    orders: Order[];
    shifts?: Shift[];
    onSelectOrder: (order: Order) => void;
    onPrintSelected: (orders: Order[]) => void;
    onDelete?: (orderId: string) => void;
    settings: AppSettings;
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ orders, shifts = [], onSelectOrder, onPrintSelected, onDelete, settings }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
    const [selectedDay, setSelectedDay] = useState<{ date: Date; orders: Order[] } | null>(null);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [selectedShiftDate, setSelectedShiftDate] = useState('');

    // --- Navigation Handlers ---
    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
        else if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
        else newDate.setDate(newDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
        else if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
        else newDate.setDate(newDate.getDate() + 1);
        setCurrentDate(newDate);
    };

    const handleAddShift = (date: Date) => {
        setSelectedShiftDate(normalizeDateStr(date.toISOString().split('T')[0]));
        setIsShiftModalOpen(true);
    };

    // --- Holiday Logic ---
    const holidaysMap = useMemo(() => {
        const holidays = getUSHolidays(currentDate.getFullYear());
        const map = new Map<string, string>();
        holidays.forEach(h => {
            const key = `${h.date.getMonth()}-${h.date.getDate()}`;
            map.set(key, map.has(key) ? `${map.get(key)} / ${h.name}` : h.name);
        });
        return map;
    }, [currentDate.getFullYear()]);

    // --- Group Orders & Shifts Logic ---
    const getOrdersForDate = (date: Date) => {
        return orders.filter(order => {
            const d = parseOrderDateTime(order);
            return d.getDate() === date.getDate() && 
                   d.getMonth() === date.getMonth() && 
                   d.getFullYear() === date.getFullYear();
        });
    };

    const getShiftsForDate = (date: Date) => {
        const dateStr = normalizeDateStr(date.toISOString().split('T')[0]);
        return shifts.filter(s => s.date === dateStr);
    };

    // --- Render Logic for Month View ---
    const renderMonthView = () => {
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

        const cells = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            cells.push(<div key={`empty-${i}`} className="min-h-[120px] bg-gray-50/50 border border-gray-200/50"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const cellDate = new Date(currentYear, currentMonth, day);
            const dailyOrders = getOrdersForDate(cellDate);
            const dailyShifts = getShiftsForDate(cellDate);
            const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
            const holidayName = holidaysMap.get(`${currentMonth}-${day}`);

            cells.push(
                <div 
                    key={day} 
                    className={`min-h-[120px] bg-white border border-gray-200 p-2 flex flex-col gap-1 transition-colors ${isToday ? 'bg-brand-tan/20' : ''} relative group`}
                    onClick={() => {
                        // Prioritize opening day orders modal if orders exist
                        if (dailyOrders.length > 0) setSelectedDay({ date: cellDate, orders: dailyOrders });
                        else handleAddShift(cellDate); // If empty, prompt to add shift
                    }}
                >
                    <div className="flex justify-between items-start">
                        <span className={`text-sm font-semibold ${isToday ? 'bg-brand-orange text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-brand-brown/70'}`}>{day}</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleAddShift(cellDate); }}
                            className="opacity-0 group-hover:opacity-100 text-brand-orange hover:bg-brand-orange/10 rounded p-0.5 transition-all"
                            title="Add Shift"
                        >
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>
                    {holidayName && <div className="text-[10px] font-medium text-purple-700 bg-purple-50 rounded px-1.5 py-0.5 mb-1 truncate border border-purple-100" title={holidayName}>{holidayName}</div>}
                    
                    {/* Shifts Indicator */}
                    {dailyShifts.length > 0 && (
                         <div className="flex flex-wrap gap-1 mb-1">
                            {dailyShifts.map(s => (
                                <span key={s.id} className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded truncate max-w-full" title={`${s.employeeName}: ${s.startTime}-${s.endTime}`}>
                                    {s.employeeName.split(' ')[0]}
                                </span>
                            ))}
                         </div>
                    )}

                    <div className="flex-grow flex flex-col gap-1 overflow-y-auto max-h-[100px]">
                        {dailyOrders.slice(0, 3).map(order => (
                            <button
                                key={order.id}
                                onClick={(e) => { e.stopPropagation(); onSelectOrder(order); }}
                                className={`text-left text-xs px-2 py-1 rounded truncate transition-colors w-full ${order.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-brand-orange/10 text-brand-brown hover:bg-brand-orange/20'}`}
                            >
                                {order.pickupTime.split(' ')[0]} {order.customerName.split(' ')[0]}
                            </button>
                        ))}
                        {dailyOrders.length > 3 && <div className="text-xs text-gray-500 text-center font-medium">+ {dailyOrders.length - 3} more</div>}
                    </div>
                </div>
            );
        }
        return <div className="grid grid-cols-7 bg-gray-200 gap-[1px]">{cells}</div>;
    };

    // --- Render Logic for Week View ---
    const renderWeekView = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + i);
            weekDays.push(dayDate);
        }

        return (
            <div className="grid grid-cols-7 bg-gray-200 gap-[1px] min-h-[600px]">
                {weekDays.map((date, i) => {
                    const dailyOrders = getOrdersForDate(date);
                    const dailyShifts = getShiftsForDate(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const holidayName = holidaysMap.get(`${date.getMonth()}-${date.getDate()}`);

                    return (
                        <div key={i} className={`bg-white p-2 flex flex-col gap-2 ${isToday ? 'bg-brand-tan/20' : ''}`}>
                            <div className="text-center border-b pb-2 mb-1 relative group">
                                <div className="text-xs font-bold text-gray-500 uppercase">{daysOfWeek[i]}</div>
                                <div className={`text-lg font-bold ${isToday ? 'text-brand-orange' : 'text-brand-brown'}`}>{date.getDate()}</div>
                                <button 
                                    onClick={() => handleAddShift(date)}
                                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-brand-orange"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                                {holidayName && <div className="text-[10px] text-purple-700 bg-purple-50 rounded px-1 py-0.5 mt-1 truncate" title={holidayName}>{holidayName}</div>}
                            </div>
                            
                            {/* Shifts */}
                             <div className="space-y-1 mb-2">
                                {dailyShifts.map(s => (
                                    <div key={s.id} className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded truncate border border-blue-200 cursor-pointer hover:bg-blue-200" onClick={() => handleAddShift(date)}>
                                        {s.employeeName} ({s.startTime}-{s.endTime})
                                    </div>
                                ))}
                            </div>

                            <div className="flex-grow space-y-2 overflow-y-auto">
                                {dailyOrders.map(order => (
                                    <button
                                        key={order.id}
                                        onClick={() => onSelectOrder(order)}
                                        className={`w-full text-left p-2 rounded border text-xs shadow-sm transition-all ${order.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100' : 'bg-white border-gray-200 hover:border-brand-orange hover:shadow-md'}`}
                                    >
                                        <div className="font-bold">{order.pickupTime}</div>
                                        <div className="truncate">{order.customerName}</div>
                                        <div className="text-gray-500">{order.totalMini + order.totalFullSize} items</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // --- Render Logic for Day View ---
    const renderDayView = () => {
        const dateStr = normalizeDateStr(currentDate.toISOString().split('T')[0]);
        const dailyOrders = getOrdersForDate(currentDate);
        const dailyShifts = getShiftsForDate(currentDate);
        
        // Sort orders by time
        const sortedOrders = [...dailyOrders].sort((a, b) => {
            return parseOrderDateTime(a).getTime() - parseOrderDateTime(b).getTime();
        });

        return (
            <div className="bg-white min-h-[600px] p-4 flex flex-col">
                <div className="text-center mb-6 relative">
                    <h3 className="text-2xl font-serif text-brand-brown">{currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                    <button 
                        onClick={() => handleAddShift(currentDate)}
                        className="absolute right-4 top-0 flex items-center gap-2 text-sm font-bold text-brand-orange bg-brand-orange/10 px-3 py-1.5 rounded hover:bg-brand-orange/20"
                    >
                        <UsersIcon className="w-4 h-4" /> Manage Shifts
                    </button>
                </div>
                
                {/* Shift Bar */}
                {dailyShifts.length > 0 && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2"><UsersIcon className="w-4 h-4"/> Staff Scheduled Today</h4>
                        <div className="flex flex-wrap gap-4">
                            {dailyShifts.map(s => (
                                <div key={s.id} className="bg-white px-3 py-2 rounded border border-blue-200 shadow-sm text-sm">
                                    <span className="font-bold text-blue-900">{s.employeeName}</span>
                                    <span className="text-gray-500 ml-2">{s.startTime} - {s.endTime} ({s.hours}h)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="max-w-3xl mx-auto w-full space-y-4">
                    {sortedOrders.length === 0 ? (
                        <div className="text-center text-gray-400 py-10 italic">No orders scheduled for this day.</div>
                    ) : (
                        sortedOrders.map(order => (
                            <div key={order.id} className="flex gap-4 group">
                                <div className="w-24 text-right pt-2 font-bold text-brand-orange text-sm shrink-0">
                                    {order.pickupTime}
                                </div>
                                <div className="relative pb-8 border-l-2 border-gray-200 pl-6 flex-grow last:border-0">
                                    <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-brand-orange border-2 border-white shadow-sm"></div>
                                    <div 
                                        onClick={() => onSelectOrder(order)}
                                        className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md hover:border-brand-orange transition-all cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-brand-brown text-lg">{order.customerName}</h4>
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${order.paymentStatus === PaymentStatus.PAID ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {order.paymentStatus}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">{order.phoneNumber}</p>
                                        <div className="text-sm bg-gray-50 p-2 rounded border border-gray-100">
                                            {order.items.map((item, idx) => (
                                                <span key={idx} className="block text-gray-700">
                                                    {item.quantity}x {item.name}
                                                </span>
                                            ))}
                                        </div>
                                        {order.deliveryRequired && (
                                            <div className="mt-2 text-xs text-blue-600 font-medium flex items-center gap-1">
                                                Delivery to: {order.deliveryAddress}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="bg-white border border-brand-tan rounded-lg overflow-hidden shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-brand-tan/20 border-b border-brand-tan gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrev} className="p-2 rounded-full hover:bg-gray-200 text-brand-brown transition-colors"><ChevronLeftIcon className="w-5 h-5" /></button>
                        <h2 className="text-xl font-serif text-brand-brown font-semibold min-w-[200px] text-center">
                            {viewMode === 'month' && currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            {viewMode === 'week' && `Week of ${currentDate.toLocaleDateString()}`}
                            {viewMode === 'day' && currentDate.toLocaleDateString()}
                        </h2>
                        <button onClick={handleNext} className="p-2 rounded-full hover:bg-gray-200 text-brand-brown transition-colors"><ChevronRightIcon className="w-5 h-5" /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="text-sm font-medium text-brand-orange hover:underline ml-2">Today</button>
                    </div>

                    <div className="flex bg-white rounded-lg p-1 border border-brand-tan shadow-sm">
                        <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'month' ? 'bg-brand-orange text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>Month</button>
                        <button onClick={() => setViewMode('week')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'week' ? 'bg-brand-orange text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>Week</button>
                        <button onClick={() => setViewMode('day')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'day' ? 'bg-brand-orange text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>Day</button>
                    </div>
                </div>

                {(viewMode === 'month' || viewMode === 'week') && (
                    <div className="grid grid-cols-7 bg-brand-brown text-white text-center py-2 text-xs font-medium uppercase tracking-wide">
                        {daysOfWeek.map(day => <div key={day}>{day}</div>)}
                    </div>
                )}

                {viewMode === 'month' && renderMonthView()}
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'day' && renderDayView()}
            </div>

            {selectedDay && (
                <DayOrdersModal 
                    date={selectedDay.date}
                    orders={selectedDay.orders}
                    onClose={() => setSelectedDay(null)}
                    onSelectOrder={onSelectOrder}
                    onPrintSelected={onPrintSelected}
                    onDelete={onDelete}
                />
            )}
            
            {isShiftModalOpen && (
                <ShiftModal 
                    employees={settings.employees || []}
                    shifts={shifts}
                    date={selectedShiftDate}
                    onClose={() => setIsShiftModalOpen(false)}
                    onSave={saveShiftToDb}
                    onDelete={deleteShiftFromDb}
                />
            )}
        </>
    );
}--- START OF FILE components/ExpenseModal.tsx ---


import React, { useState, useMemo } from 'react';
import { Expense } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, CalendarIcon, CurrencyDollarIcon, DocumentTextIcon, ListBulletIcon } from './icons/Icons';

interface ExpenseModalProps {
    expenses: Expense[];
    categories: string[];
    onClose: () => void;
    onSave: (expense: Expense) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

type SortKey = 'date' | 'category' | 'vendor' | 'item' | 'totalCost';

export default function ExpenseModal({ expenses, categories, onClose, onSave, onDelete }: ExpenseModalProps) {
    const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');
    
    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState(categories[0] || 'Ingredients');
    const [vendor, setVendor] = useState('');
    const [item, setItem] = useState('');
    const [unitName, setUnitName] = useState('');
    const [pricePerUnit, setPricePerUnit] = useState('');
    const [quantity, setQuantity] = useState('');
    const [description, setDescription] = useState(''); 
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    // Derived Total
    const calculatedTotal = (parseFloat(pricePerUnit) || 0) * (parseFloat(quantity) || 0);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);
        setSaveSuccess(false);

        if (!vendor.trim()) { setValidationError("Vendor Name is required."); return; }
        if (!item.trim()) { setValidationError("Item Name is required."); return; }
        if (!pricePerUnit || parseFloat(pricePerUnit) <= 0) { setValidationError("Price is required."); return; }
        if (!quantity || parseFloat(quantity) <= 0) { setValidationError("Quantity is required."); return; }

        setIsSaving(true);
        try {
            const newExpense: Expense = {
                id: Date.now().toString(),
                date,
                category,
                vendor,
                item,
                unitName: unitName || '', 
                pricePerUnit: parseFloat(pricePerUnit),
                quantity: parseFloat(quantity),
                totalCost: calculatedTotal,
                description: description || '' 
            };
            
            await onSave(newExpense);
            setSaveSuccess(true);
            
            setItem('');
            setPricePerUnit('');
            setQuantity('');
            setDescription('');
            
            setTimeout(() => {
                 setSaveSuccess(false);
                 setActiveTab('list');
            }, 1000);
            
        } catch (error: any) {
            console.error("Failed to save expense", error);
            setValidationError(`Database Error: ${error.message || "Unknown error"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Delete this expense record?")) {
            await onDelete(id);
        }
    };

    // Sorting Logic
    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedExpenses = useMemo(() => {
        let sortableItems = [...expenses];
        sortableItems.sort((a, b) => {
            let aVal: any = a[sortConfig.key];
            let bVal: any = b[sortConfig.key];

            // Handle numeric sorts
            if (sortConfig.key === 'totalCost') {
                aVal = a.totalCost || 0;
                bVal = b.totalCost || 0;
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [expenses, sortConfig]);

    const SortHeader = ({ label, skey }: { label: string, skey: SortKey }) => (
        <th 
            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hover:text-brand-orange transition-colors select-none"
            onClick={() => handleSort(skey)}
        >
            <div className="flex items-center gap-1">
                {label}
                {sortConfig.key === skey && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
            </div>
        </th>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col border border-brand-tan max-h-[90vh]">
                <header className="p-6 border-b border-brand-tan flex justify-between items-center">
                    <h2 className="text-2xl font-serif text-brand-brown">Expense Manager</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex border-b border-gray-200">
                    <button 
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'add' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('add')}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <PlusIcon className="w-4 h-4" /> Add Entry
                        </div>
                    </button>
                    <button 
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'list' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('list')}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <ListBulletIcon className="w-4 h-4" /> History ({expenses.length})
                        </div>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow bg-gray-50">
                    {activeTab === 'add' && (
                        <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <form onSubmit={handleSave} className="space-y-4">
                                {saveSuccess && (
                                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded relative mb-4 text-sm flex justify-between items-center">
                                        <span className="font-bold">Item Saved Successfully!</span>
                                        <button type="button" onClick={() => setActiveTab('list')} className="underline font-semibold hover:text-green-900">View List</button>
                                    </div>
                                )}
                                
                                {validationError && (
                                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-4 text-sm">
                                        <strong>Error:</strong> {validationError}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><CalendarIcon className="w-4 h-4 text-gray-400"/></div>
                                            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="pl-9 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                                        <select value={category} onChange={e => setCategory(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm">
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Vendor <span className="text-red-500">*</span></label>
                                        <input type="text" required value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Costco" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Item Name <span className="text-red-500">*</span></label>
                                        <input type="text" required value={item} onChange={e => setItem(e.target.value)} placeholder="e.g. Ground Beef" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Price ($) <span className="text-red-500">*</span></label>
                                            <input type="number" step="0.01" required value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} placeholder="0.00" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Unit</label>
                                            <input type="text" value={unitName} onChange={e => setUnitName(e.target.value)} placeholder="lbs, box" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Qty <span className="text-red-500">*</span></label>
                                            <input type="number" step="0.01" required value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="1" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                        <span className="text-sm font-bold text-gray-600">Total Item Cost:</span>
                                        <span className="text-xl font-bold text-brand-orange">${calculatedTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Notes (Optional)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><DocumentTextIcon className="w-4 h-4 text-gray-400"/></div>
                                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Extra details..." className="pl-9 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-orange focus:ring-brand-orange text-sm" />
                                    </div>
                                </div>

                                <button type="submit" disabled={isSaving} className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-orange hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange disabled:opacity-50">
                                    {isSaving ? 'Saving...' : <><PlusIcon className="w-4 h-4" /> Save Expense</>}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'list' && (
                        <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
                            {expenses.length === 0 ? (
                                <p className="text-center text-gray-500 text-sm py-8">No expenses recorded yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <SortHeader label="Date" skey="date" />
                                                <SortHeader label="Vendor" skey="vendor" />
                                                <SortHeader label="Category" skey="category" />
                                                <SortHeader label="Item / Details" skey="item" />
                                                <SortHeader label="Cost" skey="totalCost" />
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                            {sortedExpenses.map((expense) => (
                                                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">
                                                        {expense.date}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                                                        {expense.vendor}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                                            {expense.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        <div className="font-medium">{expense.item}</div>
                                                        <div className="text-xs text-gray-400">
                                                            {expense.quantity} {expense.unitName} @ ${expense.pricePerUnit}
                                                        </div>
                                                        {expense.description && <div className="text-xs text-gray-400 italic">{expense.description}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-bold text-red-600">
                                                        ${(expense.totalCost || 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                                        <button onClick={() => handleDelete(expense.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}--- START OF FILE components/ReportsView.tsx ---

import React, { useMemo, useState } from 'react';
import { Order, Expense, Shift } from '../types';
import { AppSettings } from '../services/dbService';
import { calculateSupplyCost } from '../utils/pricingUtils';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { parseOrderDateTime } from '../utils/dateUtils';
import { TrashIcon } from './icons/Icons';

interface ReportsViewProps {
    orders: Order[];
    expenses: Expense[];
    shifts?: Shift[]; // New Prop
    settings: AppSettings;
    dateRange: { start?: string; end?: string };
    onDeleteExpense?: (id: string) => void;
}

const COLORS = ['#c8441c', '#eab308', '#3b82f6', '#a855f7', '#10b981', '#6366f1', '#ef4444', '#f97316'];

type SortKey = 'date' | 'category' | 'vendor' | 'item' | 'totalCost';

export default function ReportsView({ orders, expenses, shifts = [], settings, dateRange, onDeleteExpense }: ReportsViewProps) {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    const filteredData = useMemo(() => {
        let filteredOrders = orders;
        let filteredExpenses = expenses;
        let filteredShifts = shifts;

        if (dateRange.start) {
            const start = new Date(dateRange.start);
            start.setHours(0,0,0,0);
            filteredOrders = filteredOrders.filter(o => parseOrderDateTime(o) >= start);
            filteredExpenses = filteredExpenses.filter(e => new Date(e.date) >= start);
            filteredShifts = filteredShifts.filter(s => new Date(s.date) >= start);
        }
        
        if (dateRange.end) {
            const end = new Date(dateRange.end);
            end.setHours(23,59,59,999);
            filteredOrders = filteredOrders.filter(o => parseOrderDateTime(o) <= end);
            filteredExpenses = filteredExpenses.filter(e => new Date(e.date) <= end);
            filteredShifts = filteredShifts.filter(s => new Date(s.date) <= end);
        }

        return { orders: filteredOrders, expenses: filteredExpenses, shifts: filteredShifts };
    }, [orders, expenses, shifts, dateRange]);

    const financials = useMemo(() => {
        const { orders, expenses, shifts } = filteredData;

        const revenue = orders.reduce((sum, o) => sum + o.amountCharged, 0);
        
        const estimatedMaterialUsage = orders.reduce((sum, o) => {
            return sum + (o.totalCost !== undefined ? o.totalCost : calculateSupplyCost(o.items, settings));
        }, 0);

        // Manual Expenses
        const manualExpenses = expenses.reduce((sum, e) => sum + (e.totalCost || 0), 0);
        
        // Labor Expenses (from Shifts)
        const laborExpenses = shifts.reduce((sum, s) => sum + s.laborCost, 0);
        
        const totalActualExpenses = manualExpenses + laborExpenses;
        
        const netProfit = revenue - totalActualExpenses;
        const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        return { revenue, estimatedMaterialUsage, manualExpenses, laborExpenses, totalActualExpenses, netProfit, margin };
    }, [filteredData, settings]);

    // ... (Rest of component logic for tables/charts remains similar but updated for data)
    
    const expenseBreakdownData = useMemo(() => {
        const categoryMap = new Map<string, number>();
        
        filteredData.expenses.forEach(e => {
            const cost = e.totalCost || 0;
            categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + cost);
        });
        
        // Add Labor
        if (financials.laborExpenses > 0) {
             categoryMap.set('Labor (Shifts)', financials.laborExpenses);
        }
        
        const data: {name: string, value: number}[] = [];
        categoryMap.forEach((val, key) => { data.push({ name: key, value: val }); });
        return data.filter(d => d.value > 0);
    }, [filteredData.expenses, financials.laborExpenses]);

    const pnlChartData = useMemo(() => {
        const monthlyData = new Map<string, { revenue: number, expense: number }>();
        
        // Revenue
        filteredData.orders.forEach(o => {
            const d = parseOrderDateTime(o);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const current = monthlyData.get(key) || { revenue: 0, expense: 0 };
            current.revenue += o.amountCharged;
            monthlyData.set(key, current);
        });

        // Expenses
        filteredData.expenses.forEach(e => {
            const key = e.date.substring(0, 7);
            const current = monthlyData.get(key) || { revenue: 0, expense: 0 };
            current.expense += (e.totalCost || 0);
            monthlyData.set(key, current);
        });
        
        // Shifts
        filteredData.shifts.forEach(s => {
            const key = s.date.substring(0, 7);
            const current = monthlyData.get(key) || { revenue: 0, expense: 0 };
            current.expense += s.laborCost;
            monthlyData.set(key, current);
        });

        return Array.from(monthlyData.entries())
            .sort((a,b) => a[0].localeCompare(b[0]))
            .map(([key, val]) => {
                const [y, m] = key.split('-');
                const label = new Date(parseInt(y), parseInt(m)-1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                return { name: label, Revenue: val.revenue, Expenses: val.expense, Profit: val.revenue - val.expense };
            });
    }, [filteredData]);
    
    // ... (Sort logic and tables) ...
     const sortedExpenses = useMemo(() => {
        const items = [...filteredData.expenses];
        items.sort((a, b) => {
            let aVal: any = a[sortConfig.key];
            let bVal: any = b[sortConfig.key];
            if (sortConfig.key === 'totalCost') {
                aVal = a.totalCost || 0;
                bVal = b.totalCost || 0;
            }
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return items;
    }, [filteredData.expenses, sortConfig]);

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortHeader = ({ label, skey }: { label: string, skey: SortKey }) => (
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hover:text-brand-orange transition-colors select-none" onClick={() => handleSort(skey)}>
            <div className="flex items-center gap-1">{label} {sortConfig.key === skey && (<span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>)}</div>
        </th>
    );

    return (
        <div className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">${financials.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Total Expenses (Log + Labor)</p>
                    <p className="text-2xl font-bold text-red-600">${financials.totalActualExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Net Profit</p>
                    <p className={`text-2xl font-bold ${financials.netProfit >= 0 ? 'text-brand-brown' : 'text-red-600'}`}>${financials.netProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-brand-tan shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Profit Margin</p>
                    <p className="text-2xl font-bold text-brand-orange">{financials.margin.toFixed(1)}%</p>
                </div>
            </div>
            
             <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div><h4 className="font-bold text-blue-800 text-sm uppercase">Theoretical Material Cost</h4><p className="text-xs text-blue-600">Based on recipes & orders (Reference only)</p></div>
                <p className="text-2xl font-bold text-blue-900">${financials.estimatedMaterialUsage.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                    <h3 className="text-lg font-semibold text-brand-brown mb-4">Profit & Loss Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={pnlChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                            <Legend />
                            <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                    <h3 className="text-lg font-semibold text-brand-brown mb-4">Expense Breakdown</h3>
                    {expenseBreakdownData.length > 0 ? (
                        <div className="w-full h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={expenseBreakdownData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {expenseBreakdownData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : ( <div className="flex items-center justify-center h-[300px] text-gray-400 italic">No expenses recorded for this period.</div> )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-brand-tan shadow-sm">
                <h3 className="text-lg font-semibold text-brand-brown mb-4">Recent Expenses Log</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <SortHeader label="Date" skey="date" />
                                <SortHeader label="Vendor" skey="vendor" />
                                <SortHeader label="Category" skey="category" />
                                <SortHeader label="Details" skey="item" />
                                <SortHeader label="Cost" skey="totalCost" />
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedExpenses.length === 0 ? (<tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No expenses found for this period.</td></tr>) : (
                                sortedExpenses.map((expense) => (
                                    <tr key={expense.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{expense.vendor}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{expense.category}</span></td>
                                        <td className="px-6 py-4 text-sm text-gray-500"><div className="font-medium text-brand-brown">{expense.item}</div><div className="text-xs">({expense.quantity} {expense.unitName} @ ${expense.pricePerUnit})</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">-${(expense.totalCost || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {onDeleteExpense && (
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to delete this expense?')) {
                                                            onDeleteExpense(expense.id);
                                                        }
                                                    }} 
                                                    className="text-gray-400 hover:text-red-600"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}--- START OF FILE components/AdminDashboard.tsx ---

import React, { useState, useMemo, useEffect } from 'react';
import { Order, ApprovalStatus, FollowUpStatus, PricingSettings, Flavor, Expense, Shift } from '../types';
import { parseOrderDateTime } from '../utils/dateUtils';
import { saveOrderToDb, deleteOrderFromDb, updateSettingsInDb, saveOrdersBatch, AppSettings, subscribeToExpenses, saveExpenseToDb, deleteExpenseFromDb, subscribeToShifts } from '../services/dbService';
import { calculateOrderTotal, calculateSupplyCost } from '../utils/pricingUtils';

import Header from './Header';
import DashboardMetrics from './DashboardMetrics';
import OrderList from './OrderList';
import CalendarView from './CalendarView';
import OrderFormModal from './OrderFormModal';
import OrderDetailModal from './OrderDetailModal';
import ImportOrderModal from './ImportOrderModal';
import PrintPreviewPage from './PrintPreviewPage';
import PendingOrders from './PendingOrders';
import DateRangeFilter from './DateRangeFilter';
import SettingsModal from './SettingsModal';
import ConfirmationModal from './ConfirmationModal';
import PrepListModal from './PrepListModal';
import ExpenseModal from './ExpenseModal';
import ReportsView from './ReportsView';
import { PlusCircleIcon, ListBulletIcon, CalendarDaysIcon, ArrowTopRightOnSquareIcon, CogIcon, ScaleIcon, ReceiptIcon, ChartBarIcon } from './icons/Icons';
import { User } from 'firebase/auth';

interface AdminDashboardProps {
    user: User;
    orders: Order[];
    empanadaFlavors: Flavor[];
    fullSizeEmpanadaFlavors: Flavor[];
    importedSignatures: Set<string>;
    sheetUrl: string;
    pricing: PricingSettings;
    prepSettings?: AppSettings['prepSettings'];
    settings?: AppSettings;
}

const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AdminDashboard({ 
    user, 
    orders, 
    empanadaFlavors, 
    fullSizeEmpanadaFlavors, 
    importedSignatures, 
    sheetUrl,
    pricing, 
    prepSettings,
    settings 
}: AdminDashboardProps) {

    const [view, setView] = useState<'dashboard' | 'list' | 'calendar' | 'reports'>('dashboard');
    const [dateFilter, setDateFilter] = useState<{ start?: string; end?: string }>({ start: getTodayStr() });
    const [searchTerm, setSearchTerm] = useState(''); 
    const [statusFilter, setStatusFilter] = useState<FollowUpStatus | null>(null); 
    const [viewingCancelled, setViewingCancelled] = useState(false); 
    
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [orderToEdit, setOrderToEdit] = useState<Order | undefined>(undefined);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [printPreviewOrders, setPrintPreviewOrders] = useState<Order[] | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPrepListOpen, setIsPrepListOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    // Local Data State
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);

    useEffect(() => {
        const unsubExpenses = subscribeToExpenses(setExpenses);
        const unsubShifts = subscribeToShifts(setShifts);
        return () => { unsubExpenses(); unsubShifts(); };
    }, []);

    const activeOrders = useMemo(() => orders.filter(o => o.approvalStatus === ApprovalStatus.APPROVED), [orders]);
    const pendingOrders = useMemo(() => orders.filter(o => o.approvalStatus === ApprovalStatus.PENDING), [orders]);
    const cancelledOrders = useMemo(() => orders.filter(o => o.approvalStatus === ApprovalStatus.CANCELLED), [orders]);

    const filteredOrders = useMemo(() => {
        let result = viewingCancelled ? cancelledOrders : activeOrders;
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            return result.filter(o => o.customerName.toLowerCase().includes(term) || (o.phoneNumber && o.phoneNumber.includes(term)));
        }
        if (dateFilter.start) {
            const [y, m, d] = dateFilter.start.split('-').map(Number);
            const start = new Date(y, m - 1, d);
            result = result.filter(o => parseOrderDateTime(o) >= start);
        }
        if (dateFilter.end) {
            const [y, m, d] = dateFilter.end.split('-').map(Number);
            const end = new Date(y, m - 1, d);
            end.setHours(23,59,59,999);
            result = result.filter(o => parseOrderDateTime(o) <= end);
        }
        return result;
    }, [activeOrders, cancelledOrders, viewingCancelled, dateFilter, searchTerm]);

    const ordersForList = useMemo(() => {
        if (!statusFilter) return filteredOrders;
        return filteredOrders.filter(o => o.followUpStatus === statusFilter);
    }, [filteredOrders, statusFilter]);

    const currentListFilter = viewingCancelled ? 'CANCELLED' : (statusFilter || 'ALL');
    const handleListFilterChange = (filter: string) => {
        if (filter === 'CANCELLED') { setViewingCancelled(true); setStatusFilter(null); } else if (filter === 'ALL') { setViewingCancelled(false); setStatusFilter(null); } else { setViewingCancelled(false); setStatusFilter(filter as FollowUpStatus); }
    };

    const stats = useMemo(() => {
        let result = activeOrders;
        if (dateFilter.start) {
            const [y, m, d] = dateFilter.start.split('-').map(Number);
            const start = new Date(y, m - 1, d);
            result = result.filter(o => parseOrderDateTime(o) >= start);
        }
        if (dateFilter.end) {
            const [y, m, d] = dateFilter.end.split('-').map(Number);
            const end = new Date(y, m - 1, d);
            end.setHours(23,59,59,999);
            result = result.filter(o => parseOrderDateTime(o) <= end);
        }
        const totalRevenue = result.reduce((sum, o) => sum + o.amountCharged, 0);
        const ordersToFollowUp = result.filter(o => o.followUpStatus === FollowUpStatus.NEEDED).length;
        const totalEmpanadasSold = result.reduce((sum, o) => sum + o.totalMini + o.totalFullSize, 0);
        return { totalRevenue, ordersToFollowUp, totalEmpanadasSold };
    }, [activeOrders, dateFilter]);

    const safeSettings: AppSettings = settings || { empanadaFlavors, fullSizeEmpanadaFlavors, sheetUrl, importedSignatures: Array.from(importedSignatures), pricing: pricing || { mini: { basePrice: 1.75 }, full: { basePrice: 3.00 }, packages: [], salsas: [] }, prepSettings: prepSettings || { lbsPer20: {}, fullSizeMultiplier: 2.0, discosPer: { mini: 1, full: 1 }, discoPackSize: { mini: 10, full: 10 }, productionRates: { mini: 40, full: 25 } }, scheduling: { enabled: true, intervalMinutes: 15, startTime: "09:00", endTime: "17:00", blockedDates: [], closedDays: [], dateOverrides: {} }, laborWage: 15.00, materialCosts: {}, discoCosts: { mini: 0.10, full: 0.15 }, inventory: {}, expenseCategories: ['Packaging', 'Marketing', 'Rent', 'Utilities', 'Equipment', 'Other'], employees: [] };
    const safePricing = safeSettings.pricing;

    const handleSaveOrder = async (orderData: Order | Omit<Order, 'id'>) => {
        let orderToSave: Order;
        if ('id' in orderData) { orderToSave = { ...orderData as Order }; if (orderToSave.approvalStatus === ApprovalStatus.PENDING) { orderToSave.approvalStatus = ApprovalStatus.APPROVED; } } else { orderToSave = { ...orderData, id: Date.now().toString() }; }
        await saveOrderToDb(orderToSave);
        setIsNewOrderModalOpen(false);
        setOrderToEdit(undefined);
    };

    const handleDeductInventory = async (order: Order) => {
        const currentInventory = { ...safeSettings.inventory };
        let changesMade = false;
        order.items.forEach(item => {
            const isSalsa = safePricing.salsas.some(s => item.name.includes(s.name));
            if (isSalsa) return; 
            let flavor = item.name;
            let type: 'mini' | 'full' = 'mini';
            if (item.name.startsWith('Full ')) { type = 'full'; flavor = item.name.replace('Full ', ''); }
            if (!currentInventory[flavor]) { currentInventory[flavor] = { mini: 0, full: 0 }; }
            currentInventory[flavor][type] -= item.quantity;
            changesMade = true;
        });
        if (changesMade) { await updateSettingsInDb({ inventory: currentInventory }); await saveOrderToDb({ ...order, followUpStatus: FollowUpStatus.COMPLETED }); if (selectedOrder && selectedOrder.id === order.id) { setSelectedOrder({ ...order, followUpStatus: FollowUpStatus.COMPLETED }); } }
    };

    const confirmDeleteOrder = (orderId: string) => { setConfirmModal({ isOpen: true, title: "Delete Order", message: "Are you sure you want to delete this order? This action cannot be undone.", onConfirm: async () => { await deleteOrderFromDb(orderId); if (selectedOrder?.id === orderId) setSelectedOrder(null); if (orderToEdit?.id === orderId) { setOrderToEdit(undefined); setIsNewOrderModalOpen(false); } setConfirmModal(prev => ({ ...prev, isOpen: false })); } }); };
    const handleAddNewFlavor = async (flavorName: string, type: 'mini' | 'full') => { if (type === 'mini') { if (!empanadaFlavors.some(f => f.name === flavorName)) { await updateSettingsInDb({ empanadaFlavors: [...empanadaFlavors, { name: flavorName, visible: true }] }); } } else { if (!fullSizeEmpanadaFlavors.some(f => f.name === flavorName)) { await updateSettingsInDb({ fullSizeEmpanadaFlavors: [...fullSizeEmpanadaFlavors, { name: flavorName, visible: true }] }); } } };
    const handleUpdateFollowUp = async (orderId: string, status: FollowUpStatus) => { const order = orders.find(o => o.id === orderId); if (order) await saveOrderToDb({ ...order, followUpStatus: status }); };
    const handleApproveOrder = async (orderId: string) => { const order = orders.find(o => o.id === orderId); if (order) await saveOrderToDb({ ...order, approvalStatus: ApprovalStatus.APPROVED }); };
    const handleDenyOrder = async (orderId: string) => { const order = orders.find(o => o.id === orderId); if (order) await saveOrderToDb({ ...order, approvalStatus: ApprovalStatus.CANCELLED }); };
    const handleOrdersImported = async (newOrders: Partial<Order>[], newSignatures: string[]) => { const ordersToSave: Order[] = newOrders.map((pOrder, index) => { const items = pOrder.items || []; const deliveryFee = 0; const calculatedTotal = calculateOrderTotal(items, deliveryFee, safePricing, empanadaFlavors, fullSizeEmpanadaFlavors); const calculatedCost = calculateSupplyCost(items, safeSettings); return { id: `${Date.now()}-${index}`, pickupDate: pOrder.pickupDate || '', pickupTime: pOrder.pickupTime || '', customerName: pOrder.customerName || 'Unknown', contactMethod: pOrder.contactMethod || 'Unknown', phoneNumber: pOrder.phoneNumber || null, items: items, totalFullSize: items.filter(i => i.name.includes('Full')).reduce((s, i) => s + i.quantity, 0), totalMini: items.filter(i => !i.name.includes('Full') && !i.name.includes('Salsa')).reduce((s, i) => s + i.quantity, 0), amountCharged: calculatedTotal, totalCost: calculatedCost, deliveryRequired: pOrder.deliveryRequired || false, deliveryFee: deliveryFee, amountCollected: 0, paymentMethod: null, deliveryAddress: pOrder.deliveryAddress || null, followUpStatus: FollowUpStatus.NEEDED, paymentStatus: pOrder.paymentStatus as any || 'Pending', specialInstructions: pOrder.specialInstructions || null, approvalStatus: ApprovalStatus.PENDING } as Order; }); await saveOrdersBatch(ordersToSave); const updatedSignatures = [...Array.from(importedSignatures), ...newSignatures]; await updateSettingsInDb({ importedSignatures: updatedSignatures }); setIsImportModalOpen(false); };
    const handleUpdateSheetUrl = async (url: string) => { await updateSettingsInDb({ sheetUrl: url }); };

    if (printPreviewOrders) { return <PrintPreviewPage orders={printPreviewOrders} onExit={() => setPrintPreviewOrders(null)} />; }

    return (
        <div className="min-h-screen bg-brand-cream">
            <Header user={user} variant="admin" />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="flex bg-white rounded-lg shadow-sm p-1 border border-brand-tan self-start">
                            <button onClick={() => { setView('dashboard'); setStatusFilter(null); setViewingCancelled(false); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}>Dashboard</button>
                            <button onClick={() => setView('list')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === 'list' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}><ListBulletIcon className="w-4 h-4" /> List</button>
                            <button onClick={() => setView('calendar')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === 'calendar' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}><CalendarDaysIcon className="w-4 h-4" /> Calendar</button>
                            <button onClick={() => setView('reports')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === 'reports' ? 'bg-brand-orange text-white' : 'text-brand-brown hover:bg-brand-tan/30'}`}><ChartBarIcon className="w-4 h-4" /> Reports</button>
                        </div>
                    </div>
                    <div className="flex gap-3 flex-wrap w-full md:w-auto justify-end">
                        <button onClick={() => setIsExpenseModalOpen(true)} className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><ReceiptIcon className="w-5 h-5" /> Expenses</button>
                        <button onClick={() => setIsPrepListOpen(true)} className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><ScaleIcon className="w-5 h-5" /> Prep List</button>
                        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><CogIcon className="w-5 h-5" /> Settings</button>
                        <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 bg-white text-brand-brown border border-brand-tan font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><ArrowTopRightOnSquareIcon className="w-5 h-5" /> Import</button>
                        <button onClick={() => { setOrderToEdit(undefined); setIsNewOrderModalOpen(true); }} className="flex items-center gap-2 bg-brand-brown text-white font-semibold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors shadow-sm"><PlusCircleIcon className="w-5 h-5" /> New Order</button>
                    </div>
                </div>

                <PendingOrders orders={pendingOrders} onApprove={handleApproveOrder} onDeny={handleDenyOrder} onSelectOrder={setSelectedOrder} />
                {pendingOrders.length > 0 && <div className="mb-8" />}
                {view !== 'calendar' && <DateRangeFilter initialStartDate={dateFilter.start} initialEndDate={dateFilter.end} onDateChange={setDateFilter} />}

                {view === 'dashboard' && (
                    <DashboardMetrics 
                        stats={stats} 
                        orders={activeOrders} 
                        empanadaFlavors={empanadaFlavors.map(f => f.name)} 
                        fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors.map(f => f.name)} 
                        pendingCount={pendingOrders.length}
                        cancelledCount={cancelledOrders.length}
                        onFilterStatus={(status) => {
                            if (status === 'CANCELLED') { setViewingCancelled(true); setStatusFilter(null); } else { setViewingCancelled(false); setStatusFilter(status); }
                            setView('list');
                        }}
                    />
                )}

                {view === 'list' && (
                    <OrderList 
                        title={viewingCancelled ? 'Cancelled Orders' : 'Active Orders'}
                        orders={ordersForList} 
                        onSelectOrder={setSelectedOrder} 
                        onPrintSelected={setPrintPreviewOrders} 
                        onDelete={confirmDeleteOrder} 
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        currentFilter={currentListFilter}
                        onFilterChange={handleListFilterChange}
                    />
                )}

                {view === 'calendar' && <CalendarView orders={activeOrders} shifts={shifts} onSelectOrder={setSelectedOrder} onPrintSelected={setPrintPreviewOrders} onDelete={confirmDeleteOrder} settings={safeSettings} />}
                
                {view === 'reports' && (
                    <ReportsView 
                        orders={activeOrders} 
                        expenses={expenses} 
                        shifts={shifts}
                        settings={safeSettings} 
                        dateRange={dateFilter} 
                        onDeleteExpense={deleteExpenseFromDb}
                    />
                )}
            </main>

            {isNewOrderModalOpen && <OrderFormModal order={orderToEdit} onClose={() => setIsNewOrderModalOpen(false)} onSave={handleSaveOrder} empanadaFlavors={empanadaFlavors} fullSizeEmpanadaFlavors={fullSizeEmpanadaFlavors} onAddNewFlavor={handleAddNewFlavor} onDelete={confirmDeleteOrder} pricing={safePricing} settings={safeSettings} existingOrders={orders} />}
            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdateFollowUp={handleUpdateFollowUp} onEdit={(order) => { setSelectedOrder(null); setOrderToEdit(order); setIsNewOrderModalOpen(true); }} onApprove={selectedOrder.approvalStatus === ApprovalStatus.PENDING ? handleApproveOrder : undefined} onDeny={selectedOrder.approvalStatus === ApprovalStatus.PENDING ? handleDenyOrder : (orderId) => saveOrderToDb({ ...selectedOrder, approvalStatus: ApprovalStatus.CANCELLED })} onDelete={confirmDeleteOrder} onDeductInventory={handleDeductInventory} />}
            {isImportModalOpen && <ImportOrderModal onClose={() => setIsImportModalOpen(false)} onOrdersImported={handleOrdersImported} onUpdateSheetUrl={handleUpdateSheetUrl} existingSignatures={importedSignatures} />}
            {isSettingsOpen && <SettingsModal settings={safeSettings} onClose={() => setIsSettingsOpen(false)} />}
            {isExpenseModalOpen && (
                <ExpenseModal 
                    expenses={expenses} 
                    categories={safeSettings.expenseCategories} 
                    onClose={() => setIsExpenseModalOpen(false)} 
                    onSave={saveExpenseToDb} 
                    onDelete={deleteExpenseFromDb} 
                />
            )}
            {isPrepListOpen && <PrepListModal orders={activeOrders.filter(o => { const d = parseOrderDateTime(o); if (dateFilter.start) { const [y, m, d_start] = dateFilter.start.split('-').map(Number); if (d < new Date(y, m - 1, d_start)) return false; } if (dateFilter.end) { const [y, m, d_end] = dateFilter.end.split('-').map(Number); const end = new Date(y, m - 1, d_end); end.setHours(23,59,59,999); if (d > end) return false; } return true; })} settings={safeSettings} onClose={() => setIsPrepListOpen(false)} onUpdateSettings={updateSettingsInDb} />}
            <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} isDangerous={true} confirmText="Delete" />
        </div>
    );
}