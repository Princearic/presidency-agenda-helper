@tailwind base;
@tailwind components;
@tailwind utilities;

.btn-primary {
    @apply bg-emerald-500 border-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500;
}

.btn-success {
    @apply bg-blue-500 border-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.btn-secondary {
    @apply bg-indigo-600 border-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600;
}

.btn-danger {
    @apply bg-red-500 border-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500;
}

details summary::after {
    content: '\f078';
    font-family: 'Font Awesome 6 Free';
    font-weight: 900;
    transition: transform 0.3s ease-in-out;
    margin-left: 0.5rem;
}

details[open] summary::after {
    transform: rotate(180deg);
}

.error-border {
    @apply border-red-500;
}

.checked-item {
    @apply text-gray-400 line-through italic dark:text-gray-500;
}

.assigned-name {
    @apply text-blue-600 hover:underline dark:text-blue-400;
}

.assigned-name:active {
    @apply bg-blue-100 dark:bg-blue-900;
}

#message-box.error {
    @apply bg-red-500;
}

#message-box.show {
    @apply opacity-100;
}

@media (max-width: 640px) {
    button[title]:hover::after {
        @apply content-[attr(title)] absolute bg-gray-700 text-white p-1 rounded text-xs bottom-full left-1/2 transform -translate-x-1/2 whitespace-nowrap;
    }
}
