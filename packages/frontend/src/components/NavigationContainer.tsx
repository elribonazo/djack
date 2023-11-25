const NavigationContainer = ({ children }) => {
  return (
    <div className="bg-white dark:bg-gray-900 dark:border-gray-800 w-10 sm:w-48 flex-shrink-0 border-r border-gray-200 flex-col sm:flex">
      {children}
    </div>
  );
};

export default NavigationContainer;
