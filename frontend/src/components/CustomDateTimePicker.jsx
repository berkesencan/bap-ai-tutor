import React, { useState, useEffect, useRef } from 'react';
import './CustomDateTimePicker.css';

const CustomDateTimePicker = ({ 
  value, 
  onChange, 
  label, 
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date());
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const [selectedHour, setSelectedHour] = useState(value ? new Date(value).getHours() : 9);
  const [selectedMinute, setSelectedMinute] = useState(value ? new Date(value).getMinutes() : 0);
  const [is24Hour] = useState(true); // Using 24-hour format for consistency
  
  const pickerRef = useRef(null);
  const inputRef = useRef(null);

  // Close picker when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setCurrentDate(date);
      setViewDate(date);
      setSelectedHour(date.getHours());
      setSelectedMinute(date.getMinutes());
    }
  }, [value]);

  const formatDisplayValue = (date) => {
    if (!date) return '';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleDateSelect = (day) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day, selectedHour, selectedMinute);
    setCurrentDate(newDate);
    onChange(newDate);
    
    // Optional: Auto-close after date selection on mobile
    if (window.innerWidth <= 640) {
      setTimeout(() => setIsOpen(false), 300);
    }
  };

  const handleTimeChange = (hour, minute) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour, minute);
    setCurrentDate(newDate);
    onChange(newDate);
  };

  // Auto-scroll selected time into view when picker opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const selectedHourElement = document.querySelector('.time-option.selected');
        if (selectedHourElement) {
          selectedHourElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
    }
  }, [isOpen]);

  const navigateMonth = (direction) => {
    const newViewDate = new Date(viewDate);
    newViewDate.setMonth(viewDate.getMonth() + direction);
    setViewDate(newViewDate);
  };

  const navigateToToday = () => {
    const today = new Date();
    setViewDate(today);
    setCurrentDate(today);
    setSelectedHour(today.getHours());
    setSelectedMinute(today.getMinutes());
    onChange(today);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const today = new Date();
    const selectedDay = currentDate.getDate();
    const selectedMonth = currentDate.getMonth();
    const selectedYear = currentDate.getFullYear();
    const isCurrentMonth = viewDate.getMonth() === selectedMonth && viewDate.getFullYear() === selectedYear;

    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getDate() === day && 
                     today.getMonth() === viewDate.getMonth() && 
                     today.getFullYear() === viewDate.getFullYear();
      const isSelected = isCurrentMonth && day === selectedDay;

      days.push(
        <button
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => handleDateSelect(day)}
          type="button"
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const renderTimeSelector = () => {
    return (
      <div className="time-selector">
        <div className="time-section">
          <label>Hour</label>
          <div className="time-scroll">
            {Array.from({ length: 24 }, (_, i) => (
              <button
                key={i}
                className={`time-option ${selectedHour === i ? 'selected' : ''}`}
                onClick={() => handleTimeChange(i, selectedMinute)}
                type="button"
              >
                {i.toString().padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
        
        <div className="time-section">
          <label>Minute</label>
          <div className="time-scroll">
            {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
              <button
                key={minute}
                className={`time-option ${selectedMinute === minute ? 'selected' : ''}`}
                onClick={() => handleTimeChange(selectedHour, minute)}
                type="button"
              >
                {minute.toString().padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`custom-datetime-picker ${className}`}>
      {label && <label className="datetime-label">{label}</label>}
      
      <div className="datetime-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={formatDisplayValue(currentDate)}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onChange={() => {}} // Controlled by picker
          placeholder="Select date & time..."
          className="datetime-display-input"
          disabled={disabled}
          readOnly
        />
        <button
          type="button"
          className="datetime-toggle"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          📅
        </button>
      </div>

      {isOpen && (
        <div ref={pickerRef} className="datetime-picker-dropdown">
          <div className="picker-header">
            <button 
              type="button" 
              className="nav-button" 
              onClick={() => navigateMonth(-1)}
            >
              ‹
            </button>
            
            <h3 className="month-year">
              {viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            
            <button 
              type="button" 
              className="nav-button" 
              onClick={() => navigateMonth(1)}
            >
              ›
            </button>
          </div>

          <div className="calendar-grid">
            <div className="weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>
            
            <div className="calendar-days">
              {renderCalendar()}
            </div>
          </div>

          {renderTimeSelector()}

          <div className="picker-footer">
            <button 
              type="button" 
              className="footer-button secondary" 
              onClick={navigateToToday}
            >
              Today
            </button>
            <button 
              type="button" 
              className="footer-button primary" 
              onClick={() => setIsOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDateTimePicker;
