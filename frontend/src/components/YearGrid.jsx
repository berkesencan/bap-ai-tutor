import React from 'react';

const YearGrid = ({ year = new Date().getFullYear(), onDayClick, onMonthClick }) => {
  const months = Array.from({ length: 12 }, (_, i) => i);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderMonth = (monthIndex) => {
    const firstDay = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const monthName = firstDay.toLocaleString('default', { month: 'long' });

    const blanks = Array.from({ length: firstDay.getDay() }, (_, i) => (
      <div key={`blank-${monthIndex}-${i}`} className="year-grid-day blank" />
    ));

    const days = Array.from({ length: daysInMonth }, (_, d) => {
      const date = new Date(year, monthIndex, d + 1);
      const isToday = new Date().toDateString() === date.toDateString();
      
      return (
        <button
          key={`day-${monthIndex}-${d}`}
          className={`year-grid-day ${isToday ? 'today' : ''}`}
          onClick={() => onDayClick && onDayClick(date)}
        >
          {d + 1}
        </button>
      );
    });

    return (
      <div key={monthIndex} className="year-grid-month">
        <button 
          className="year-grid-month-header"
          onClick={() => onMonthClick && onMonthClick(new Date(year, monthIndex, 1))}
        >
          {monthName}
        </button>
        <div className="year-grid-calendar">
          <div className="year-grid-weekdays">
            {weekdays.map((day, index) => (
              <div key={`weekday-${monthIndex}-${index}`} className="year-grid-weekday">
                {day.charAt(0)}
              </div>
            ))}
          </div>
          <div className="year-grid-days">
            {blanks}
            {days}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="year-grid">
      <div className="year-grid-header">
        <h2 className="year-grid-title">{year}</h2>
      </div>
      <div className="year-grid-months">
        {months.map(renderMonth)}
      </div>
    </div>
  );
};

export default YearGrid; 