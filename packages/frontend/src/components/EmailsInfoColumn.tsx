const EmailsInfoColumn = ({ children, isOpen = false }) => {
  return (
    <div
      className={`w-full ${
        isOpen ? "lg:w-96 xl:w-132" : ""
      } flex-shrink-0 h-full overflow-y-auto`}
    >
      {children}
    </div>
  );
};

export default EmailsInfoColumn;
