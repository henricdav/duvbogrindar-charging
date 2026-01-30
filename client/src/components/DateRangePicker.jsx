import React from 'react';
import { format } from 'date-fns';

function DateRangePicker({ fromDate, toDate, onFromChange, onToChange }) {
  const formatDateForInput = (date) => {
    return format(date, 'yyyy-MM-dd');
  };

  return (
    <div className="date-range-picker">
      <div className="date-input">
        <label htmlFor="from-date">From:</label>
        <input
          id="from-date"
          type="date"
          value={formatDateForInput(fromDate)}
          onChange={(e) => onFromChange(new Date(e.target.value))}
        />
      </div>
      <div className="date-input">
        <label htmlFor="to-date">To:</label>
        <input
          id="to-date"
          type="date"
          value={formatDateForInput(toDate)}
          onChange={(e) => onToChange(new Date(e.target.value))}
        />
      </div>
    </div>
  );
}

export default DateRangePicker;
