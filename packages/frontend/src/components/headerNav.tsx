import React, { useEffect, useRef, useState } from "react";


const menuElements = [
  {
    name: "Home",
    link: "/",
  },
  {
    name: "App",
    link: "/app",
  },
];

const Nav = () => {
  const ref = useRef();
  const [showMenu, setShowMenu] = useState(false);

  const handleClickOutside = (e) => {
    if (ref && ref.current && !(ref.current as any).contains(e.target)) {
      setShowMenu(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  });

  function onToggleClick() {
    setShowMenu(!showMenu);
  }

  return (
    <nav className="sticky top-0 sm:relative sm:top-auto z-50 text-gray-900">
      <div className="mx-auto flex-row  sm:flex justify-between">
        <div className="flex flex-wrap bg-gray-800 sm:bg-transparent   py-4 px-4 text-xl font-bold ">
          <a
            href="/"
            className=" flex-1 text-indigo-400 hover:no-underline font-bold text-4xl"
          >
            @
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-pink-500 to-purple-500">
              DJACK BETA
            </span>
          </a>
          <button
            onClick={onToggleClick}
            className="flex-none align-self-end sm:hidden text-white z-30 x-8 h-8 focus:outline-none md:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
        <ul className="hidden sm:flex flex-row absolute sm:relative w-full sm:w-auto ">
          {menuElements.map(({ link, name }, i) => (
            <li
              key={`MenuEl${i}`}
              className="text-gray-700 border-fuchsia-600 bg-gray-800 opacity-75 sm:bg-transparent sm:opacity-100  border-transparent hover:no-underline hover:border-blue-700 hover:bg-gray-800 sm:hover:bg-gray-900  hover:opacity-75 hover:text-white"
            >
              <a
                href={link}
                className={`text-gray-700 relative block py-6 px-2 lg:p-6 text-sm lg:text-base font-bold hover:text-gray-500`}
              >
                {name}
              </a>
            </li>
          ))}
        </ul>
        {showMenu && (
          <ul className="flex-row sm:hidden absolute sm:relative w-full sm:w-auto">
            {menuElements.map(({ link, name }, i) => (
              <li
                key={`MenuEl${i}`}
                className="flex-1 text-gray-700 border-fuchsia-600 bg-gray-800 sm:bg-transparent sm:opacity-100  border-transparent hover:no-underline hover:border-blue-700 hover:bg-gray-800 sm:hover:bg-gray-900 "
              >
                <a href={link}>
                  <a
                    className={`text-gray-700 relative block py-6 px-2 lg:p-6 text-sm lg:text-base font-bold `}
                  >
                    {name}
                  </a>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
};

export default Nav;
