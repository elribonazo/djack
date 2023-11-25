const MainContainer = ({ children }) => {
  return (
    <div className="flex-grow overflow-hidden h-full flex flex-col">
      {children}
    </div>
  );
};

export default MainContainer;
