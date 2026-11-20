import { NavLink } from 'react-router-dom';
import { IconChartDonut, IconHome, IconList, IconReceipt } from '@tabler/icons-react';

const ITEMS = [
  { to: '/', label: 'Home', Icon: IconHome },
  { to: '/history', label: 'History', Icon: IconList },
  { to: '/insights', label: 'Insights', Icon: IconChartDonut },
  { to: '/debts', label: 'Debts', Icon: IconReceipt },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {ITEMS.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              <span className={`nav-box ${isActive ? 'inset' : ''}`}><Icon size={19} stroke={1.75} /></span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
