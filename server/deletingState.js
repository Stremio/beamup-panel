const deleting = []

module.exports = {
	add: (proj) => {
		const index = deleting.indexOf(proj)
		if (index === -1)
			deleting.push(proj)
	},
	remove: (proj) => {
        const index = deleting.indexOf(proj)
        if (index !== -1)
          deleting.splice(index, 1)
  	},
  	has: (proj) => {
  		return deleting.includes(proj)
  	},
  	getAll: () => {
  		return deleting
  	}
}
